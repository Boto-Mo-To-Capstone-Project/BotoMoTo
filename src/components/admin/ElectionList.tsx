
// Folder: your-project/components/admin/ElectionList.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ElectionList({ orgId }: { orgId: string }) {
  interface Election {
    id: string;
    name: string;
    start: string;
    finish: string;
    org_id: string;
    is_deleted: boolean;
    created_at: string;

  }

  const [elections, setElections] = useState<Election[]>([]);
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [finish, setFinish] = useState('');

  const fetchElections = async () => {
    const { data } = await supabase
      .from('election')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_deleted', false);
    setElections(data || []);
  };

  const createElection = async () => {
    const startUTC = new Date(start).toISOString();
    const finishUTC = new Date(finish).toISOString();

    await supabase.from('election').insert({
      org_id: orgId,
      name,
      start: startUTC,
      finish: finishUTC,
    });
    setName('');
    setStart('');
    setFinish('');
    fetchElections();
  };

  useEffect(() => {
    fetchElections();
  });
  

  return (
    <div className='text-gray-800 p-6'>
      <h1 className="text-2xl font-bold mb-4">Elections</h1>

      <div className="mb-6">
        <h2 className="font-semibold mb-2">Create New Election</h2>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block border rounded p-2 mb-2 w-full"
        />
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="block border rounded p-2 mb-2 w-full"
        />
        <input
          type="datetime-local"
          value={finish}
          onChange={(e) => setFinish(e.target.value)}
          className="block border rounded p-2 mb-2 w-full"
        />
        <button
          onClick={createElection}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create
        </button>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Existing Elections</h2>
        <ul>
          {elections.map((election) => (
            <li key={election.id} className="border p-2 rounded mb-2">
              <strong>{election.name}</strong><br />
              {new Date(election.start).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} - {new Date(election.finish).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
              <p>{ new Date(election.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}asf</p>
              <button
                onClick={async () => {
                  await supabase
                    .from('election')
                    .update({ is_deleted: true })
                    .eq('id', election.id);
                  fetchElections();
                }}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mt-2"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
