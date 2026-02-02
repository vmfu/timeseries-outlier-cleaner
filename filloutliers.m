function [b,tf,lthresh,uthresh,center] = filloutliers(a,fill,varargin)
% FILLOUTLIERS Replace outliers in data
%   B = FILLOUTLIERS(A,FILL) finds outliers in A and replaces them
%   according to FILL. An outlier is an element that is greater than 3
%   scaled median absolute deviation (MAD) away from the median. The scaled
%   MAD is defined as K*MEDIAN(ABS(A-MEDIAN(A))) where K is the scaling
%   factor and is approximately 1.4826. FILL can be a numeric scalar, in
%   which case the outliers will be replaced with the scalar value. FILL
%   can also be a method specified by one of the following:
%     'center'      - Replaces with the center value, which is the global 
%                     or local median or mean, or an estimated value
%                     depending on METHOD.
%     'clip'        - Replace all outliers above the upper threshold with 
%                     the upper threshold value, and all outliers below the
%                     lower threshold with the lower threshold value.
%     'previous'    - Previous non-outlier entry.
%     'next'        - Next non-outlier entry.
%     'nearest'     - Nearest non-outlier entry.
%     'linear'      - Linear interpolation of non-outlier entries.
%     'spline'      - Piecewise cubic spline interpolation of non-outlier 
%                     entries.
%     'pchip'       - Shape-preserving piecewise cubic spline interpolation
%                     of non-outlier entries.
%     'makima'      - Modified Akima cubic interpolation of non-outlier 
%                     entries.
%
%   If A is a matrix or a table, FILLOUTLIERS operates on each column
%   separately. If A is an N-D array, FILLOUTLIERS operates along the first
%   array dimension whose size does not equal 1.
%
%   B = FILLOUTLIERS(A,FILL,METHOD) specifies the method to determine
%   outliers, where METHOD is one of the following:
%     'median'    - Returns all elements more than 3 scaled MAD from the
%                   median. This is the default.
%     'mean'      - Returns all elements more than 3 standard deviations
%                   from the mean. This is also known as the three-sigma
%                   rule, and is a fast but less robust method.
%     'quartiles' - Returns all elements more than 1.5 interquartile ranges
%                   (IQR) above the upper quartile or below the lower
%                   quartile. This method makes few assumptions about data 
%                   distribution, and is appropriate if A is not normally 
%                   distributed.
%     'grubbs'    - Applies Grubbs' test for outliers, which is an 
%                   iterative method that removes one outlier per iteration
%                   until no more outliers are found. This method uses 
%                   formal statistics of hypothesis testing and gives more 
%                   objective reasoning backed by statistics behind its 
%                   outlier identification. It assumes normal distribution 
%                   and may not be appropriate if A is not normal.
%     'gesd'      - Applies the generalized extreme Studentized deviate
%                   test for outliers. Like 'grubbs', this is another 
%                   iterative method that removes one outlier per 
%                   iteration. It may offer improved performance over 
%                   'grubbs' when there are multiple outliers that mask one
%                   another.
%
%   B = FILLOUTLIERS(A,FILL,'percentiles',[LP UP]) detects as outliers all
%   elements which are below the lower percentile LP and above the upper
%   percentile UP. LP and UP must be scalars between 0 and 100 with 
%   LP <= UP.
%
%   B = FILLOUTLIERS(A,FILL,MOVMETHOD,WL) uses a moving window method to
%   determine contextual outliers instead of global outliers. Contextual
%   outliers are outliers in the context of their neighborhood, and may not
%   be the maximum or minimum values in A. MOVMETHOD can be:
%     'movmedian' - Returns all elements more than 3 local scaled MAD from
%                   the local median, over a sliding window of length WL.
%     'movmean'   - Returns all elements more than 3 local standard 
%                   deviations from the local mean, over a sliding window 
%                   of length WL.
%   WL is the length of the moving window. It can either be a scalar or a
%   two-element vector, which specifies the number of elements before and
%   after the current element.
%
%   B = FILLOUTLIERS(...,DIM) specifies the dimension to operate along.
%
%   B = FILLOUTLIERS(...,'ThresholdFactor',P) modifies the outlier
%   detection thresholds by a factor P. See the documentation for more
%   information.
%
%   B = FILLOUTLIERS(...,'SamplePoints',X) specifies the sample points X
%   representing the location of the data in A, which is used by moving
%   window methods. X must be a numeric or datetime vector, and must be
%   sorted with unique elements. If the first input is a table, X can also
%   specify a table variable. For example, X can specify time stamps for
%   the data in A. By default, outliers uses data sampled uniformly at
%   points X = [1 2 3 ... ].
%
%   B = FILLOUTLIERS(...,'MaxNumOutliers',MAXN) specifies the
%   maximum number of outliers for the 'gesd' method only. The default is
%   10% of the number of elements. Set MAXN to a larger value to ensure it
%   replaces all outliers. Setting MAXN too large can reduce efficiency.
%
%   B = FILLOUTLIERS(...,'OutlierLocations',TF) specifies the outlier
%   locations according to the logical array TF. Elements of TF that are
%   true indicate outliers in the corresponding element of A. TF must have
%   the same size as A.
%
%   [B,TF,LTHRESH,UTHRESH,CENTER] = FILLOUTLIERS(...) also returns the
%   location of the filled outliers, and also the lower threshold, upper
%   threshold, and the center value used by the outlier detection method.
%
%   Arguments supported only when first input is table or timetable:
% 
%   B = FILLOUTLIERS(...,'DataVariables', DV) finds and replaces outliers
%   only in the table variables specified by DV. The default is all table
%   variables in A. DV must be a table variable name, a cell array of table
%   variable names, a vector of table variable indices, a logical vector, a
%   function handle that returns a logical scalar (such as @isnumeric), or
%   a table vartype subscript. B has the same size as A.
%
%   B = FILLOUTLIERS(...,'ReplaceValues',TF) specifies how the filled data
%   is returned. TF must be one of the following:
%        true   - (default) replace table variables with the filled data 
%        false  - append the filled data as additional table variables
%
%   Examples:
%      % Detect outliers in a data vector and replace them using linear
%      % interpolation
%      x = [60 59 49 49 58 1000 61 57 48 62];
%      y = filloutliers(x, 'linear');
%
%   Class support for input A:
%      float: double, single
%      table, timetable
%
%   See also isoutlier, islocalmax, islocalmin, ischange, ismissing,
%            rmoutliers, smoothdata, fillmissing, rmmissing

%   Copyright 2016-2022 The MathWorks, Inc.

[method, wl, dim, p, sp, vars, fill, maxoutliers, lowup, replace] = ...
    parseinput(a, fill, varargin);

dim = min(dim, ndims(a)+1);
xistable = istabular(a);

if xistable
    if replace
        b = a;
    else
        b = a(:,vars);
        vars = 1:width(b);
    end
    tf = false(size(b));
    if nargout > 2
        if ~islogical(method) && ismember(method, {'movmedian', 'movmean'})
            % with moving methods, the thresholds and center have the same
            % size as input
            lthresh = b(:,vars);
        elseif height(b) == 0
            lthresh = b(:,vars);
            lthresh = matlab.internal.datatypes.lengthenVar(lthresh,1);
        else
            % with other methods, thresholds and center has reduced
            % dimension along first dimension
            lthresh = b(1,vars);
        end
        uthresh = lthresh;
        center = lthresh;
    end
    for i = 1:length(vars)
        vari = b.(vars(i));
        if ~(isempty(vari) || iscolumn(vari))
            error(message('MATLAB:filloutliers:NonColumnTableVar'));
        end
        if ~isfloat(vari)
            error(message('MATLAB:filloutliers:NonfloatTableVar',...
                b.Properties.VariableNames{vars(i)}, class(vari)));
        end
        if ~isreal(vari)
            error(message('MATLAB:filloutliers:ComplexTableVar'));
        end
        if islogical(method)
            [out, lt, ut, c, yi] = locateoutliers(vari, ...
                method(:,vars(i)), wl, p, sp, maxoutliers, fill, lowup);
        else
            [out, lt, ut, c, yi] = locateoutliers(vari, ...
                method, wl, p, sp, maxoutliers, fill, lowup);
        end
        tf(:,vars(i)) = any(out,2);
        b.(vars(i)) = yi;
        if nargout > 2
            lthresh.(i) = lt;
            uthresh.(i) = ut;
            center.(i) = c;
        end
    end
    if ~replace
        b = matlab.internal.math.appendDataVariables(a,b,"filled");
        if nargout > 1
            tf = [false(size(a)) tf];
        end
    end
else
    asparse = issparse(a);
    % Avoid overhead for unnecessary permute calls
    if (dim > 1) && ~isscalar(a)
        dims = 1:max(ndims(a),dim);
        dims(1) = dim;
        dims(dim) = 1;
        if asparse && dim > 2
            % permuting beyond second dimension not supported for sparse
            a = full(a);
        end
        a = permute(a, dims);
        if islogical(method)
            method = permute(method, dims);
        end
    end
    [tf, lthresh, uthresh, center, b] = locateoutliers(a, method, ...
        wl, p, sp, maxoutliers, fill, lowup);

    if (dim > 1) && ~isscalar(a)
        b = ipermute(b, dims);
        if asparse
            % explicitly convert to sparse. If dim > 2, we have converted
            % to full previously
            b = sparse(b);
        end
        if nargout > 1
            tf = ipermute(tf, dims);
            lthresh = ipermute(lthresh, dims);
            uthresh = ipermute(uthresh, dims);
            center = ipermute(center, dims);
            if asparse
                tf = sparse(tf);
                lthresh = sparse(lthresh);
                uthresh = sparse(uthresh);
                center = sparse(center);
            end
        end
    end

end

function [method, wl, dim, p, samplepoints, datavariables, fill, ...
    maxoutliers, lowup, replace] = parseinput(a, fill, input)
% Parse FILLOUTLIER inputs
method = 'median';
methodinput = false;
wl = [];
p = [];
samplepoints = [];
datavariables = [];
maxoutliers = [];
lowup = [];
replace = true;
funcname = mfilename;

validateattributes(a,{'single','double','table','timetable'}, {'real'}, funcname, 'A', 1);
aistable = istabular(a);
if aistable
    datavariables = 1:width(a);
end
% dim
if aistable
    dim = 1;
else
    dim = matlab.internal.math.firstNonSingletonDim(a);
end

if ischar(fill) || isstring(fill)
    fill = validatestring(fill, {'center', 'clip',...
        'previous', 'next', 'nearest', 'linear', 'spline', ...
        'pchip','makima'},funcname, 'Fill', 2);
else
    validateattributes(fill, {'numeric'}, {'scalar'}, funcname, ...
        'Fill', 2);
end

if ~isempty(input)
    i = 1;
    % parse methods and movmethod
    if ischar(input{i}) || isstring(input{i})
        str = validatestring(input{i},{'median', 'mean', 'quartiles', 'grubbs', ...
            'gesd', 'movmedian', 'movmean', 'percentiles', 'SamplePoints', 'ReplaceValues', ...
            'DataVariables', 'ThresholdFactor', 'MaxNumOutliers', 'OutlierLocations'}, i+2);
        if ismember(str, {'median', 'mean', 'quartiles', 'grubbs','gesd'})
            % method
            method = str;
            methodinput = true;
            i = i+1;
        elseif ismember(str, {'movmedian', 'movmean'})
            % movmethod
            method = str;
            if isscalar(input)
                error(message('MATLAB:filloutliers:MissingWindowLength',method));
            end
            methodinput = true;
            wl = input{i+1};
            if (isnumeric(wl) && isreal(wl)) || islogical(wl) || isduration(wl)
                if isscalar(wl)
                    if wl <= 0 || ~isfinite(wl)
                        error(message('MATLAB:filloutliers:WindowLengthInvalidSizeOrClass'));
                    end
                elseif numel(wl) == 2
                    if any(wl < 0 | ~isfinite(wl))
                        error(message('MATLAB:filloutliers:WindowLengthInvalidSizeOrClass'));
                    end
                else
                    error(message('MATLAB:filloutliers:WindowLengthInvalidSizeOrClass'));
                end
            else
                error(message('MATLAB:filloutliers:WindowLengthInvalidSizeOrClass'));
            end
            i = i+2;
        elseif isequal(str,'percentiles')
            method = str;
            methodinput = true;
            lowup = input{i+1};
            if  ~isnumeric(lowup) || ~isreal(lowup) || ~isequal(size(lowup),[1 2]) || any(isnan(lowup)) ||...
                    lowup(1)<0 || lowup(1)>100 || lowup(2)<0 || lowup(2)>100 || lowup(1)>lowup(2)
                error(message('MATLAB:filloutliers:PercentilesInvalid'));
            end
            i = i+2;
        end
    end
    % parse dim
    if i <= length(input)
        if ~(ischar(input{i}) || isstring(input{i}))
            validateattributes(input{i},{'numeric'}, {'scalar', 'integer', 'positive'}, ...
                funcname, 'dim', i+2);
            dim = input{i};
            if aistable && dim ~= 1
                error(message('MATLAB:filloutliers:TableDim'));
            end
            i = i+1;
        end

        % parse N-V pairs
        inputlen = length(input);
        spvar = [];
        if rem(inputlen - i + 1,2) ~= 0
            error(message('MATLAB:filloutliers:ArgNameValueMismatch'))
        end
        for i = i:2:inputlen
            name = validatestring(input{i}, {'SamplePoints', 'ReplaceValues',...
                'DataVariables', 'ThresholdFactor', 'MaxNumOutliers', 'OutlierLocations'}, i+2);

            value = input{i+1};
            switch name
                case 'SamplePoints'
                    if istimetable(a)
                        error(message('MATLAB:samplePoints:SamplePointsTimeTable'));
                    end
                    [samplepoints,spvar] = matlab.internal.math.checkSamplePoints(value,a,aistable,false,dim);
                    if ~isempty(a) && ~(isfloat(samplepoints) || isduration(samplepoints) || isdatetime(samplepoints))
                        error(message('MATLAB:samplePoints:SamplePointsInvalidDatatype'));
                    end
                case 'DataVariables'
                    if aistable
                        datavariables = matlab.internal.math.checkDataVariables(a,value,'filloutliers');
                    else
                        error(message('MATLAB:filloutliers:DataVariablesArray'));
                    end
                case 'ReplaceValues'
                    if aistable
                        replace = matlab.internal.datatypes.validateLogical(value,'ReplaceValues');
                    else
                        error(message('MATLAB:filloutliers:ReplaceValuesArray'));
                    end
                case 'ThresholdFactor'
                    if isequal(method,'percentiles')
                        error(message('MATLAB:filloutliers:UnsupportedThreshold'));
                    end
                    validateattributes(value,{'numeric'}, {'real', 'scalar', ...
                        'nonnegative', 'nonnan'}, funcname, 'ThresholdFactor', i+3);
                    p = double(value);
                case 'MaxNumOutliers'
                    validateattributes(value,{'numeric'}, {'scalar', 'positive', ...
                        'integer'}, funcname, 'MaxNumOutliers', i+3);
                    maxoutliers = double(value);
                case 'OutlierLocations'
                    validateattributes(value,{'logical'}, {'size', size(a)}, ...
                        funcname, 'OutlierLocations', i+3);
                    if methodinput
                        error(message('MATLAB:filloutliers:MethodNotAllowed'));
                    end
                    if any(strcmp(fill, {'center', 'clip'}))
                        error(message('MATLAB:filloutliers:UnsupportedFill'));
                    end
                    method = value;
            end
        end
        if ~isempty(spvar)
            datavariables(datavariables == spvar) = [];
        end
    end
end
if ~islogical(method)
    if isempty(p)  % default p
        switch method
            case {'median','mean','movmedian','movmean'}
                p = 3;
            case 'quartiles'
                p = 1.5;
            otherwise % grubbs, gesd
                p = 0.05;
        end
    elseif ismember(method, {'grubbs', 'gesd'})
        if p > 1
            error(message('MATLAB:filloutliers:AlphaOutOfRange'));
        end
    end
end

if ~isempty(maxoutliers)
    if ~strcmp(method, 'gesd')
        error(message('MATLAB:filloutliers:MaxNumOutliersGesdOnly'));
    elseif maxoutliers > size(a,dim)
        error(message('MATLAB:filloutliers:MaxNumOutliersTooLarge'));
    end
end

if (isdatetime(samplepoints) || isduration(samplepoints)) && ...
        ~isempty(wl) && ~isduration(wl)
    error(message('MATLAB:samplePoints:SamplePointsNonDuration'));
end
if istimetable(a)
    samplepoints = a.Properties.RowTimes;
end
