import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_admin/dashboard')({
    component: DashboardPage,
})

function DashboardPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome to your admin dashboard
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: 'Total Users', value: '12,345', icon: '👥', color: 'bg-blue-500', change: '+12%' },
                    { title: 'Revenue', value: '$45,231', icon: '💰', color: 'bg-green-500', change: '+8%' },
                    { title: 'Orders', value: '576', icon: '🛒', color: 'bg-purple-500', change: '+23%' },
                    { title: 'Pending', value: '23', icon: '⏳', color: 'bg-yellow-500', change: '-5%' },
                ].map((stat, i) => (
                    <div
                        key={i}
                        className="bg-background rounded-xl shadow-sm p-6 border"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{stat.title}</p>
                                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                <p className={`text-xs mt-1 ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                                    {stat.change} from last month
                                </p>
                            </div>
                            <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-2xl`}>
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-background rounded-xl shadow-sm p-6 border">
                    <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {['Add New Route', 'Manage Users', 'View Reports', 'Settings'].map((action, i) => (
                            <button
                                key={i}
                                className="p-4 text-center rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-background rounded-xl shadow-sm p-6 border">
                    <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                    <div className="space-y-4">
                        {[
                            { action: 'New booking', user: 'John Doe', time: '2 minutes ago' },
                            { action: 'Route updated', user: 'Admin', time: '15 minutes ago' },
                            { action: 'User registered', user: 'Jane Smith', time: '1 hour ago' },
                            { action: 'Payment received', user: 'Mike Johnson', time: '2 hours ago' },
                        ].map((activity, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div>
                                    <p className="font-medium">{activity.action}</p>
                                    <p className="text-muted-foreground">{activity.user}</p>
                                </div>
                                <p className="text-muted-foreground text-xs">{activity.time}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
