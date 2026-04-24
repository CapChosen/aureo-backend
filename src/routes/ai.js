const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../lib/supabase');
const { requireAuth, checkAILimit } = require('../middleware/auth');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/ai/chat
router.post('/chat', requireAuth, checkAILimit, async (req, res) => {
  const { message, portfolio, phases } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Mensaje requerido' });
  }

  try {
    // Guardar mensaje del usuario
    await supabase.from('chat_history').insert({
      user_id: req.user.id,
      role: 'user',
      content: message
    });

    // Obtener historial reciente
    const { data: history } = await supabase
      .from('chat_history')
      .select('role, content')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const messages = (history || []).reverse().map(h => ({
      role: h.role,
      content: h.content
    }));

    // Contexto del portafolio
    const portfolioContext = portfolio
      ? `Portafolio: ${JSON.stringify(portfolio)}. Fases: ${JSON.stringify(phases)}.`
      : 'Sin portafolio configurado aún.';

    // Llamada a Claude con API key segura en el servidor
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `Eres el asistente financiero de Áureo, plataforma chilena de inversiones.
Contexto del portafolio del usuario: ${portfolioContext}
Fecha: ${new Date().toLocaleDateString('es-CL')}.
Responde en español, conciso y profesional. Máximo 200 palabras.
Siempre aclara que eres una herramienta educativa, no un asesor CMF regulado.`,
      messages
    });

    const reply = response.content[0].text;

    // Guardar respuesta en historial
    await supabase.from('chat_history').insert({
      user_id: req.user.id,
      role: 'assistant',
      content: reply
    });

    // Incrementar contador de consultas
    await supabase
      .from('users')
      .update({ ai_calls_this_month: req.aiCallsUsed + 1 })
      .eq('id', req.user.id);

    res.json({
      reply,
      calls_used: req.aiCallsUsed + 1,
      calls_limit: req.aiCallsLimit
    });

  } catch (error) {
    console.error('Error en chat IA:', error);
    res.status(500).json({ error: 'Error al procesar la consulta' });
  }
});

// GET /api/ai/history
router.get('/history', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) return res.status(500).json({ error: 'Error al obtener historial' });
  res.json(data);
});

// DELETE /api/ai/history
router.delete('/history', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('chat_history')
    .delete()
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: 'Error al limpiar historial' });
  res.json({ message: 'Historial eliminado' });
});


// POST /api/ai/news
router.post('/news', requireAuth, async (req, res) => {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: 'Genera 5 noticias financieras relevantes para inversores de hoy en Chile y mercados globales. Responde SOLO con JSON puro sin markdown ni texto adicional: [{"title":"titulo","summary":"2 oraciones de impacto en mercados","cat":"Economia","sent":"positive","src":"fuente","time":"hace 1h"}]'
      }]
    });
    const txt = response.content[0].text;
    const match = txt.match(/\[[\s\S]*\]/);
    const news = match ? JSON.parse(match[0]) : [];
    res.json({ news });
  } catch(e) {
    console.error('Error noticias:', e.message);
    res.json({ news: [] });
  }
});

module.exports = router;