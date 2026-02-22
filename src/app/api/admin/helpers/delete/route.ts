import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'https://superheroobackend.onrender.com';

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const access = cookieStore.get('him_admin_access')?.value;
    if (!access) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { helperId } = body;

    const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${helperId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access}`,
        },
    });

    if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: text }, { status: res.status });
    }

    return NextResponse.json({ ok: true });
}
