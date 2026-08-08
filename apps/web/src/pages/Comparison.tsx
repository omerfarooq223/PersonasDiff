import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { api } from '../lib/api';
import { analytics } from '../lib/analytics';
import {
  Loader2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';

const confidenceColors = {
  HIGH: 'text-green-500',
  MEDIUM: 'text-amber-500',
  LOW: 'text-red-500',
};

const confidenceIcons = {
  HIGH: CheckCircle,
  MEDIUM: AlertTriangle,
  LOW: XCircle,
};

export default function Comparison() {
  const { id } = useParams<{ id: string }>();
  const [exportingFormat, setExportingFormat] = useState<'json' | 'csv' | null>(null);

  const {
    data: comparison,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['comparison', id],
    queryFn: () => api.getComparison(id!),
    enabled: !!id,
  });

  // Track comparison view
  useEffect(() => {
    if (id) {
      analytics.trackComparisonViewed(id);
    }
  }, [id]);

  const handleExport = async (format: 'json' | 'csv') => {
    if (!id) return;
    try {
      setExportingFormat(format);
      const record = await api.createExport(id, format);
      const download = await api.getExportDownload(record.id);

      const link = document.createElement('a');
      link.href = download.downloadUrl;
      link.download = `run_comparison_${id.slice(0, 8)}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportingFormat(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Failed to load comparison. Please try again.</p>
          <Link to={`/runs/${id}`}>
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Run
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const ConfidenceIcon = confidenceIcons[comparison.confidence];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <Link to={`/runs/${id}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Comparison Results</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Run {id?.slice(0, 8)} • {new Date(comparison.timestampUtc).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => handleExport('json')}
            disabled={exportingFormat !== null}
          >
            {exportingFormat === 'json' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Export JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={exportingFormat !== null}
          >
            {exportingFormat === 'csv' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Overall Observation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Overall Observation</CardTitle>
            <div className="flex items-center space-x-2">
              <ConfidenceIcon className={`h-5 w-5 ${confidenceColors[comparison.confidence]}`} />
              <span className={`text-sm font-medium ${confidenceColors[comparison.confidence]}`}>
                {comparison.confidence} Confidence
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{comparison.overallObservation}</p>
          {comparison.warnings.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-amber-600 dark:text-amber-500">Warnings</h4>
              {comparison.warnings.map((warning, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compared Personas */}
      <Card>
        <CardHeader>
          <CardTitle>Compared Personas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {comparison.comparedPersonas.map((personaId) => (
              <span
                key={personaId}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
              >
                {personaId.slice(0, 8)}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Detailed Metrics</h2>
        {comparison.metrics.map((metric, idx) => {
          const MetricConfidenceIcon = confidenceIcons[metric.confidence];
          return (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{metric.metricName}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <MetricConfidenceIcon
                      className={`h-4 w-4 ${confidenceColors[metric.confidence]}`}
                    />
                    <span className={`text-xs font-medium ${confidenceColors[metric.confidence]}`}>
                      {metric.confidence}
                    </span>
                  </div>
                </div>
                <CardDescription>Version {metric.metricVersion}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Result</h4>
                  <p className="text-lg font-semibold">
                    {typeof metric.result === 'boolean'
                      ? metric.result
                        ? 'True'
                        : 'False'
                      : metric.result}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Explanation</h4>
                  <p className="text-sm text-muted-foreground">{metric.explanation}</p>
                </div>
                {metric.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-amber-600 dark:text-amber-500">
                      Warnings
                    </h4>
                    {metric.warnings.map((warning, wIdx) => (
                      <div
                        key={wIdx}
                        className="flex items-start space-x-2 text-sm text-muted-foreground"
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-end space-x-4">
        <Link to={`/runs/${id}/replay`}>
          <Button variant="outline">View Replay</Button>
        </Link>
      </div>
    </div>
  );
}
