const express = require('express');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ════════════════════════════════════════════════════════
// GET /api/community/posts?page=1&limit=20
// ════════════════════════════════════════════════════════
router.get('/posts', requireAuth, async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const from  = (page - 1) * limit;

  try {
    const { data: posts, error, count } = await supabase
      .from('community_posts')
      .select(`
        id, content, portfolio_context, created_at, author_email,
        community_likes(count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw error;

    // Check which posts the current user liked
    const postIds = (posts || []).map(p => p.id);
    let userLikes = new Set();
    if (postIds.length > 0) {
      const { data: likes } = await supabase
        .from('community_likes')
        .select('post_id')
        .eq('user_id', req.user.id)
        .in('post_id', postIds);
      (likes || []).forEach(l => userLikes.add(l.post_id));
    }

    const enriched = (posts || []).map(p => ({
      id:                p.id,
      content:           p.content,
      portfolio_context: p.portfolio_context,
      created_at:        p.created_at,
      author_email:      p.author_email,
      likes:             p.community_likes?.[0]?.count ?? 0,
      liked_by_me:       userLikes.has(p.id),
    }));

    res.json({ posts: enriched, total: count, page, limit });
  } catch (err) {
    console.error('[Community] Error getting posts:', err.message);
    res.status(500).json({ error: 'Error al obtener publicaciones' });
  }
});

// ════════════════════════════════════════════════════════
// POST /api/community/posts
// Body: { content, portfolio_context? }
// ════════════════════════════════════════════════════════
router.post('/posts', requireAuth, async (req, res) => {
  const { content, portfolio_context } = req.body;

  if (!content || content.trim().length < 10) {
    return res.status(400).json({ error: 'El contenido debe tener al menos 10 caracteres' });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: 'El contenido no puede superar 2000 caracteres' });
  }

  try {
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id:           req.user.id,
        author_email:      req.user.email,
        content:           content.trim(),
        portfolio_context: portfolio_context || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ post: { ...data, likes: 0, liked_by_me: false } });
  } catch (err) {
    console.error('[Community] Error creating post:', err.message);
    res.status(500).json({ error: 'Error al publicar' });
  }
});

// ════════════════════════════════════════════════════════
// POST /api/community/posts/:id/like
// ════════════════════════════════════════════════════════
router.post('/posts/:id/like', requireAuth, async (req, res) => {
  const postId = req.params.id;

  try {
    const { error } = await supabase
      .from('community_likes')
      .upsert({ post_id: postId, user_id: req.user.id }, { onConflict: 'post_id,user_id' });

    if (error) throw error;

    const { count } = await supabase
      .from('community_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    res.json({ liked: true, likes: count });
  } catch (err) {
    console.error('[Community] Error liking post:', err.message);
    res.status(500).json({ error: 'Error al dar me gusta' });
  }
});

// ════════════════════════════════════════════════════════
// DELETE /api/community/posts/:id/like
// ════════════════════════════════════════════════════════
router.delete('/posts/:id/like', requireAuth, async (req, res) => {
  const postId = req.params.id;

  try {
    const { error } = await supabase
      .from('community_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', req.user.id);

    if (error) throw error;

    const { count } = await supabase
      .from('community_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    res.json({ liked: false, likes: count });
  } catch (err) {
    console.error('[Community] Error unliking post:', err.message);
    res.status(500).json({ error: 'Error al quitar me gusta' });
  }
});

// ════════════════════════════════════════════════════════
// DELETE /api/community/posts/:id  (only own posts)
// ════════════════════════════════════════════════════════
router.delete('/posts/:id', requireAuth, async (req, res) => {
  const postId = req.params.id;

  try {
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    console.error('[Community] Error deleting post:', err.message);
    res.status(500).json({ error: 'Error al eliminar publicación' });
  }
});

module.exports = router;
