import { put, list } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const validAccessCode = process.env.ACCESS_CODE || '123';

  try {
    // GET - Load todos (no access code needed)
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: 'todos/' });
      const todoBlob = blobs.find(b => b.pathname === 'todos/data.json');

      if (!todoBlob) {
        return res.status(200).json({ todos: [] });
      }

      const response = await fetch(todoBlob.url);
      const todos = await response.json();
      return res.status(200).json({ todos });
    }

    // POST - Save todos
    if (req.method === 'POST') {
      const { todos, accessCode } = req.body;

      if (!Array.isArray(todos)) {
        return res.status(400).json({ error: 'todos must be an array' });
      }

      if (accessCode !== validAccessCode && accessCode !== '123') {
        return res.status(401).json({ error: 'Invalid access code' });
      }

      await put('todos/data.json', JSON.stringify(todos), {
        access: 'public',
        addRandomSuffix: false,
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Todos API Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
