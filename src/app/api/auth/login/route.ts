import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { signToken } from '@/lib/jwt';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const superEmail = process.env.SUPERADMIN_EMAIL;
  const superHash = process.env.SUPERADMIN_PASSWORD;

  // const superEmail = "superadmin@boto.com";
  // const superHash = "$2b$10$8Pk7RGH5jBvZXD5dlWsnc.SATOqaYaWYVOQ533z52/M.A9zk8LALO";
  
  // console.log(process.env.SUPERADMIN_EMAIL)
  // console.log(process.env.SUPERADMIN_PASSWORD)

  // Check Superadmin login
  if (email === superEmail) {
    console.log(process.env.SUPERADMIN_EMAIL)
    console.log(process.env.SUPERADMIN_PASSWORD)
    
    const match = await bcrypt.compare(password, superHash!);
    if (!match) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const token = signToken({ email, role: 'superadmin' });

    console.log(token)

    const res = NextResponse.json({ message: 'Superadmin login success' });
    res.cookies.set('token', token, { httpOnly: true });
    return res;
  }

  // Else: check admin in DB
  const { data, error } = await supabase
    .from('admin')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Invalid admin' }, { status: 401 });

  const match = await bcrypt.compare(password, data.password);
  if (!match) return NextResponse.json({ error: 'Wrong password' }, { status: 401 });

  const token = signToken({ email, role: 'admin', org_id: data.org_id });

  const res = NextResponse.json({ message: 'Admin login success' });
  res.cookies.set('token', token, { httpOnly: true });
  return res;
}
