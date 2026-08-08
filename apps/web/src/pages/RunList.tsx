import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { api } from '../lib/api';
import {
  Loader2,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Activity,
} from 'lucide-react';

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

export default function RunList() {
  const {
    data: runsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['runs'],
    queryFn: () => api.listRuns(20, 0),
  });

  const runs = runsData?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Runs</h1>
          <p className="text-muted-foreground mt-2">View and manage your comparison runs.</p>
        </div>
        <Link to="/runs/new">
          <Button>
            <Play className="mr-2 h-4 w-4" />
            New Run
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">Failed to load runs. Please try again.</p>
          </CardContent>
        </Card>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No runs yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first run to start comparing web experiences.
              </p>
              <Link to="/runs/new">
                <Button>
                  <Play className="mr-2 h-4 w-4" />
                  Create Run
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {runs.map((run) => {
            const StatusIcon = statusIcons[run.status as keyof typeof statusIcons];
            const statusColor = statusColors[run.status as keyof typeof statusColors];

            return (
              <Card key={run.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <StatusIcon
                        className={`h-5 w-5 ${statusColor} ${run.status === 'running' ? 'animate-spin' : ''}`}
                      />
                      <div>
                        <Link to={`/runs/${run.id}`} className="hover:underline">
                          <CardTitle className="text-lg font-semibold">
                            {run.id.slice(0, 8)}
                          </CardTitle>
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Created {new Date(run.createdAt).toLocaleString()}
                        </p>
                        <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
                          {run.personaVersionIds && (
                            <span className="bg-secondary px-2 py-0.5 rounded text-secondary-foreground">
                              {run.personaVersionIds.length} Personas
                            </span>
                          )}
                          {run.surfaceId && <span>Surface: {run.surfaceId.slice(0, 8)}</span>}
                          {run.journeyVersionId && (
                            <span>Journey: {run.journeyVersionId.slice(0, 8)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium capitalize ${statusColor}`}>
                        {run.status.replace('_', ' ')}
                      </span>
                      <Link to={`/runs/${run.id}`}>
                        <Button variant="ghost" size="icon" aria-label="View run details">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
