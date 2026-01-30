import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  Users, 
  Eye, 
  Clock, 
  TrendingUp, 
  Globe, 
  Monitor, 
  Smartphone,
  LogOut,
  Settings,
  ShieldAlert
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

// Mock data para demostración
const pageViewsData = [
  { name: 'Lun', views: 4000 },
  { name: 'Mar', views: 3000 },
  { name: 'Mié', views: 5000 },
  { name: 'Jue', views: 2780 },
  { name: 'Vie', views: 1890 },
  { name: 'Sáb', views: 2390 },
  { name: 'Dom', views: 3490 },
];

const sessionsData = [
  { name: 'Semana 1', sessions: 2400 },
  { name: 'Semana 2', sessions: 1398 },
  { name: 'Semana 3', sessions: 9800 },
  { name: 'Semana 4', sessions: 3908 },
];

const deviceData = [
  { name: 'Desktop', value: 55, color: 'hsl(var(--primary))' },
  { name: 'Mobile', value: 35, color: 'hsl(var(--secondary))' },
  { name: 'Tablet', value: 10, color: 'hsl(var(--accent))' },
];

const topPagesData = [
  { page: '/', views: 12500, percentage: 45 },
  { page: '/servicios', views: 8200, percentage: 30 },
  { page: '/contacto', views: 4100, percentage: 15 },
  { page: '/nosotros', views: 2800, percentage: 10 },
];

const Dashboard = () => {
  const { user, isLoading, signOut, verifyAdminServerSide } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(true);
  const [serverVerifiedAdmin, setServerVerifiedAdmin] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  // Server-side admin verification
  useEffect(() => {
    const verifyAdmin = async () => {
      if (user && !isLoading) {
        setIsVerifyingAdmin(true);
        const isAdminVerified = await verifyAdminServerSide();
        setServerVerifiedAdmin(isAdminVerified);
        setIsVerifyingAdmin(false);
      }
    };

    verifyAdmin();
  }, [user, isLoading, verifyAdminServerSide]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Sesión cerrada',
      description: 'Has cerrado sesión exitosamente',
    });
    navigate('/');
  };

  // Show loading while verifying authentication or admin status
  if (isLoading || isVerifyingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show restricted access message for non-admins (server-verified)
  if (!serverVerifiedAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold">Dashboard de Métricas</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Acceso Restringido</CardTitle>
              <CardDescription>
                No tienes permisos para acceder al dashboard de métricas. 
                Contacta al administrador para solicitar acceso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/')} variant="outline">
                Volver al Inicio
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Dashboard de Métricas</h1>
              <p className="text-xs text-muted-foreground">Google Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              Admin
            </span>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Alert for mock data */}
        <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4">
            <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>
                <strong>Datos de demostración.</strong> Configura tu API de Google Analytics para ver datos reales.
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Visitas Totales
              </CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">27,600</div>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +12.5% vs mes anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Usuarios Únicos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18,420</div>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +8.2% vs mes anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Duración Promedio
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2:45</div>
              <p className="text-xs text-muted-foreground">minutos por sesión</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tasa de Rebote
              </CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42.3%</div>
              <p className="text-xs text-red-600 flex items-center gap-1">
                +2.1% vs mes anterior
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Page Views Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Visitas por Día</CardTitle>
              <CardDescription>Últimos 7 días</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  views: { label: 'Visitas', color: 'hsl(var(--primary))' },
                }}
                className="h-[300px]"
              >
                <BarChart data={pageViewsData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Sessions Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Sesiones</CardTitle>
              <CardDescription>Último mes</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  sessions: { label: 'Sesiones', color: 'hsl(var(--primary))' },
                }}
                className="h-[300px]"
              >
                <LineChart data={sessionsData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Dispositivos</CardTitle>
              <CardDescription>Distribución de tráfico</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {deviceData.map((device) => (
                  <div key={device.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: device.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {device.name === 'Desktop' && <Monitor className="inline h-3 w-3 mr-1" />}
                      {device.name === 'Mobile' && <Smartphone className="inline h-3 w-3 mr-1" />}
                      {device.value}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Pages */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Páginas Más Visitadas</CardTitle>
              <CardDescription>Top 4 páginas del sitio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPagesData.map((page) => (
                  <div key={page.page} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{page.page}</span>
                        <span className="text-sm text-muted-foreground">
                          {page.views.toLocaleString()} visitas
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${page.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
