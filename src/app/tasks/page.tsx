import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api';
import { Nav } from '@/components/Nav';
import { TasksGrid } from '@/components/TasksGrid';

type Task = {
  id: string;
  buyerId: string;
  title: string;
  description: string;
  urgency: string;
  timeMinutes: number;
  budgetPaise: number;
  lat: number;
  lng: number;
  addressText: string | null;
  status: string;
  assignedHelperId: string | null;
  createdAt: string;
};

export default async function TasksPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get('him_admin_access')) {
    redirect('/login');
  }

  const res = await apiFetch<Task[]>('/api/v1/admin/tasks');
  const tasks = res.ok && Array.isArray(res.data) ? res.data : [];

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <TasksGrid tasks={tasks} />
      </main>
    </div>
  );
}
