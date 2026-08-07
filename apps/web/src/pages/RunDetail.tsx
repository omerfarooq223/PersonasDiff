import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { api, type Run } from '../lib/api';
import { analytics } from '../lib/analytics';
import { Loader2, Play, XCircle, CheckCircle, AlertCircle, BarChart3, History, Clock } from 'lucide-react';

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: run, isLoading, error } = useQuery({
    queryKey: ['run', id],
    queryFn: () => api.getRun(id!),
    enabled: !!id,
  });

  // Track run view
  useEffect(() => {
    if (run) {
      analytics.trackRunViewed(run.id);
    }
  }, [run]);

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelRun(id!),
    onSuccess: () => {
      // Refetch will happen automatically due to query invalidation
    },
  });

  const canCancel = run?.status === 'queued' || run?.status === 'running';
  const isComplete = run?.status === 'completed' || run?.status === 'partially_completed' || run?.status === 'failed';

  const statusIcons = {
    draft: Clock,
    queued: Clock,
    running: Loader2,
    completed: CheckCircle,
    partially_completed: AlertCircle,
    failed: XCircle,
    cancelled: XCircle,
  };

  const statusColors = {
    draft: 'text-muted-foreground',
    queued: 'text-blue-500',
    running: 'text-blue-500',
    completed: 'text-green-500',
    partially_completed: 'text-amber-500',
    failed: 'text-red-500',
    cancelled: 'text-muted-foreground',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            Failed to load run. Please try again.
          </p>
          <Link to="/runs">
            <Button variant="outline" className="mt-4">
              Back to Runs
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = statusIcons[run.status as keyof typeof statusIcons];
  const statusColor = statusColors[run.status as keyof typeof statusColors];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <StatusIcon className={`h-6 w-6 ${statusColor} ${run.status === 'running' ? 'animate-spin' : ''}`} />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Run {run.id.slice(0, 8)}</h1>
              <p className="text-muted-foreground mt-1">
                Created {new Date(run.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canCancel && (
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Run
                </>
              )}
            </Button>
          )}
          {isComplete && (
            <>
              <Link to={`/runs/${run.id}/comparison`}>
                <Button variant="outline">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Comparison
                </Button>
              </Link>
              <Link to={`/runs/${run.id}/replay`}>
                <Button>
                  <History className="mr-2 h-4 w-4" />
                  View Replay
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <span className={`text-sm font-medium capitalize ${statusColor}`}>
                {run.status.replace('_', ' ')}
              </span>
            </div>
            {run.correlationId && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Correlation ID</span>
                <span className="text-sm text-muted-foreground">{run.correlationId}</span>
              </div>
            )}
            {run.status === 'running' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">Processing...</span>
                </div>
                <Progress value={undefined} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {run.status === 'failed' && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Run Failed</CardTitle>
            <CardDescription>
              The run encountered an error during execution. Check the logs for more details.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {run.status === 'cancelled' && (
        <Card>
          <CardHeader>
            <CardTitle>Run Cancelled</CardTitle>
            <CardDescription>
              The run was cancelled by an operator.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
