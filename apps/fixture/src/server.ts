import Fastify from 'fastify';

const app = Fastify({ logger: true });
const port = Number(process.env.FIXTURE_PORT ?? '4300');

const products = {
  control: [
    { id: 'alpha', name: 'Alpha', price: '10.00' },
    { id: 'beta', name: 'Beta', price: '20.00' },
  ],
  variant: [
    { id: 'beta', name: 'Beta', price: '18.00' },
    { id: 'alpha', name: 'Alpha', price: '10.00' },
  ],
} as const;

app.get('/health', async () => ({ status: 'ok' }));
app.get('/robots.txt', async (_request, reply) => {
  return reply.type('text/plain').send('User-agent: *\nAllow: /fixture\n');
});
app.get<{ Querystring: { persona?: string } }>('/fixture', async (request, reply) => {
  const persona = request.query.persona === 'variant' ? 'variant' : 'control';
  const items = products[persona]
    .map(
      (item, index) =>
        `<li data-testid="product" data-id="${item.id}" data-rank="${index + 1}">` +
        `<span>${item.name}</span><data value="${item.price}">$${item.price}</data></li>`,
    )
    .join('');

  return reply.type('text/html').send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Deterministic fixture</title></head>
  <body data-persona="${persona}">
    <main><h1>Fixture catalogue</h1><ol>${items}</ol></main>
  </body>
</html>`);
});

await app.listen({ host: '0.0.0.0', port });
