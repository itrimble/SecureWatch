'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, ExternalLink, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface OpenSearchWidgetProps {
  /** OpenSearch Dashboards visualization URL */
  visualizationUrl: string;
  /** Widget title */
  title: string;
  /** Widget height in pixels */
  height?: number;
  /** Whether to show the widget border */
  showBorder?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Refresh interval in seconds (0 to disable) */
  refreshInterval?: number;
  /** Whether to allow fullscreen mode */
  allowFullscreen?: boolean;
  /** Custom iframe sandbox attributes */
  sandboxAttributes?: string[];
  /** Callback when widget loads */
  onLoad?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export function OpenSearchWidget({
  visualizationUrl,
  title,
  height = 400,
  showBorder = true,
  className = '',
  refreshInterval = 0,
  allowFullscreen = true,
  sandboxAttributes = ['allow-scripts', 'allow-same-origin'],
  onLoad,
  onError
}: OpenSearchWidgetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Validate and sanitize URL
  const sanitizedUrl = React.useMemo(() => {
    try {
      const url = new URL(visualizationUrl);
      // Ensure it's from a trusted OpenSearch Dashboards instance
      const trustedHosts = process.env.NEXT_PUBLIC_OPENSEARCH_DASHBOARDS_HOSTS?.split(',') || ['localhost:5601'];
      const isTrusted = trustedHosts.some(host => url.host === host || url.host.endsWith(`.${host}`));
      
      if (!isTrusted) {
        throw new Error('Untrusted OpenSearch Dashboards host');
      }
      
      // Add embed parameters for cleaner integration
      url.searchParams.set('embed', 'true');
      url.searchParams.set('_g', '()'); // Global state
      
      return url.toString();
    } catch (err) {
      setError(`Invalid visualization URL: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return null;
    }
  }, [visualizationUrl]);

  // Handle iframe load
  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
    onLoad?.();
  };

  // Handle iframe error
  const handleError = () => {
    const errorMsg = 'Failed to load OpenSearch Dashboards visualization';
    setError(errorMsg);
    setIsLoading(false);
    onError?.(errorMsg);
  };

  // Refresh visualization
  const refresh = () => {
    if (iframeRef.current && sanitizedUrl) {
      setIsLoading(true);
      setLastRefresh(Date.now());
      iframeRef.current.src = `${sanitizedUrl}&_t=${Date.now()}`;
    }
  };

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, sanitizedUrl]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!allowFullscreen) return;
    
    if (!isFullscreen && iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    
    setIsFullscreen(!isFullscreen);
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!sanitizedUrl) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} ${!showBorder ? 'border-0 shadow-none' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={isLoading}
              className="h-8 w-8"
              title="Refresh visualization"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {allowFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="h-8 w-8"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(visualizationUrl, '_blank')}
              className="h-8 w-8"
              title="Open in OpenSearch Dashboards"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative" style={{ height }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading visualization...</span>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={`${sanitizedUrl}&_t=${lastRefresh}`}
            className="w-full h-full border-0"
            sandbox={sandboxAttributes.join(' ')}
            onLoad={handleLoad}
            onError={handleError}
            title={`${title} - OpenSearch Dashboards Visualization`}
            allow="fullscreen"
            style={{
              backgroundColor: 'var(--background)',
              colorScheme: 'dark'
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Preset widget configurations for common visualizations
export const OpenSearchPresets = {
  /**
   * Security Events Timeline
   */
  SecurityTimeline: (dashboardsUrl: string, indexPattern: string = 'securewatch-logs') => ({
    visualizationUrl: `${dashboardsUrl}/app/visualize#/create?type=histogram&indexPattern=${indexPattern}&_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-24h,to:now))&_a=(filters:!(),linked:!f,query:(language:kuery,query:'security.risk_score:>50'),uiState:(),vis:(aggs:!((enabled:!t,id:'1',params:(),schema:metric,type:count),(enabled:!t,id:'2',params:(drop_partials:!f,extended_bounds:(),field:timestamp,interval:auto,min_doc_count:1,scaleMetricValues:!f,timeRange:(from:now-24h,to:now),useNormalizedOpenSearchInterval:!t),schema:segment,type:date_histogram)),params:(addLegend:!t,addTimeMarker:!f,addTooltip:!t,categoryAxes:!((id:CategoryAxis-1,labels:(filter:!t,show:!t,truncate:100),position:bottom,scale:(type:linear),show:!t,style:(),title:(),type:category)),defaultYExtents:!f,drawLinesBetweenPoints:!t,grid:(categoryLines:!f,valueAxis:ValueAxis-1),interpolate:linear,labels:(show:!f),legendPosition:right,radiusRatio:9,scale:linear,seriesParams:!((data:(id:'1',label:Count),drawLinesBetweenPoints:!t,interpolate:linear,lineWidth:2,mode:stacked,show:!t,showCircles:!t,type:histogram,valueAxis:ValueAxis-1)),setYExtents:!f,showCircles:!t,times:!(),type:histogram,valueAxes:!((id:ValueAxis-1,labels:(filter:!f,rotate:0,show:!t,truncate:100),name:LeftAxis-1,position:left,scale:(mode:normal,type:linear),show:!t,style:(),title:(text:Count),type:value))),title:'Security%20Events%20Timeline',type:histogram))`,
    title: 'Security Events Timeline',
    height: 300
  }),

  /**
   * Top Attack Techniques
   */
  TopAttackTechniques: (dashboardsUrl: string, indexPattern: string = 'securewatch-logs') => ({
    visualizationUrl: `${dashboardsUrl}/app/visualize#/create?type=horizontal_bar&indexPattern=${indexPattern}&_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-7d,to:now))&_a=(filters:!(),linked:!f,query:(language:kuery,query:'security.mitre_technique:*'),uiState:(),vis:(aggs:!((enabled:!t,id:'1',params:(),schema:metric,type:count),(enabled:!t,id:'2',params:(field:security.mitre_technique,missingBucket:!f,missingBucketLabel:Missing,order:desc,orderBy:'1',otherBucket:!f,otherBucketLabel:Other,size:10),schema:segment,type:terms)),params:(addLegend:!t,addTooltip:!t,categoryAxes:!((id:CategoryAxis-1,labels:(filter:!f,rotate:0,show:!t,truncate:200),position:left,scale:(type:linear),show:!t,style:(),title:(),type:category)),grid:(categoryLines:!f,valueAxis:ValueAxis-1),labels:(show:!f),legendPosition:right,seriesParams:!((data:(id:'1',label:Count),drawLinesBetweenPoints:!t,interpolate:linear,mode:normal,show:!t,showCircles:!t,type:histogram,valueAxis:ValueAxis-1)),thresholdLine:(color:%23E7664C,show:!f,style:full,value:10,width:1),times:!(),type:horizontal_bar,valueAxes:!((id:ValueAxis-1,labels:(filter:!t,rotate:75,show:!t,truncate:100),name:BottomAxis-1,position:bottom,scale:(mode:normal,type:linear),show:!t,style:(),title:(text:Count),type:value))),title:'Top%20MITRE%20ATT%26CK%20Techniques',type:horizontal_bar))`,
    title: 'Top Attack Techniques',
    height: 400
  }),

  /**
   * User Activity Heatmap
   */
  UserActivityHeatmap: (dashboardsUrl: string, indexPattern: string = 'securewatch-logs') => ({
    visualizationUrl: `${dashboardsUrl}/app/visualize#/create?type=heatmap&indexPattern=${indexPattern}&_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-24h,to:now))&_a=(filters:!(),linked:!f,query:(language:kuery,query:'user.name:*'),uiState:(),vis:(aggs:!((enabled:!t,id:'1',params:(),schema:metric,type:count),(enabled:!t,id:'2',params:(field:user.name,missingBucket:!f,missingBucketLabel:Missing,order:desc,orderBy:'1',otherBucket:!f,otherBucketLabel:Other,size:20),schema:segment,type:terms),(enabled:!t,id:'3',params:(drop_partials:!f,extended_bounds:(),field:timestamp,interval:auto,min_doc_count:1,scaleMetricValues:!f,timeRange:(from:now-24h,to:now),useNormalizedOpenSearchInterval:!t),schema:group,type:date_histogram)),params:(addLegend:!t,addTooltip:!t,colorSchema:Greens,colorsNumber:4,colorsRange:!(),enableHover:!f,invertColors:!f,legendPosition:right,percentageMode:!f,scale:linear,setColorRange:!f,times:!(),type:heatmap,valueAxes:!((id:ValueAxis-1,labels:(color:black,overwriteColor:!f,rotate:0,show:!f),scale:(defaultYExtents:!f,type:linear),show:!f,type:value))),title:'User%20Activity%20Heatmap',type:heatmap))`,
    title: 'User Activity Heatmap',
    height: 350
  }),

  /**
   * Real-time Event Stream
   */
  EventStream: (dashboardsUrl: string, indexPattern: string = 'securewatch-logs') => ({
    visualizationUrl: `${dashboardsUrl}/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!f,value:5000),time:(from:now-15m,to:now))&_a=(columns:!(timestamp,severity,user.name,process.name,security.action,raw_message),filters:!(),index:'${indexPattern}',interval:auto,query:(language:kuery,query:''),sort:!(!(timestamp,desc)))`,
    title: 'Real-time Event Stream',
    height: 500,
    refreshInterval: 30
  })
};