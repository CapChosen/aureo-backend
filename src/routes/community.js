const express = require('express');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ════════════════════════════════════════════════════════
// GROUPS
// ════════════════════════════════════════════════════════

// GET /api/community/groups
router.get('/groups', requireAuth, async (req, res) => {
  try {
    const { data: groups, error } = await supabase
      .from('community_groups')
      .select('id, slug, name, description, icon, color, is_default, member_count')
      .order('is_default', { ascending: false })
      .order('member_count', { ascending: false });

    if (error) throw error;

    // Check which groups the user has joined
    const { data: memberships } = await supabase
      .from('community_group_members')
      .select('group_id')
      .eq('user_id', req.user.id);

    const joined = new Set((memberships || []).map(m => m.group_id));

    const enriched = (groups || []).map(g => ({
      ...g,
      is_member: joined.has(g.id),
    }));

    res.json({ groups: enriched });
  } catch (err) {
    console.error('[Community] Error getting groups:', err.message);
    res.status(500).json({ error: 'Error al obtener grupos' });
  }
});

// POST /api/community/groups/:id/join
router.post('/groups/:id/join', requireAuth, async (req, res) => {
  const groupId = req.params.id;
  try {
    const { error } = await supabase
      .from('community_group_members')
      .upsert({ group_id: groupId, user_id: req.user.id }, { onConflict: 'group_id,user_id' });

    if (error) throw error;

    // Update member_count
    await supabase.rpc('increment_group_members', { gid: groupId }).catch(() => {
      // fallback: recalculate
      supabase
        .from('community_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .then(({ count }) => {
          if (count !== null) supabase.from('community_groups').update({ member_count: count }).eq('id', groupId);
        });
    });

    res.json({ joined: true });
  } catch (err) {
    console.error('[Community] Error joining group:', err.message);
    res.status(500).json({ error: 'Error al unirse al grupo' });
  }
});

// DELETE /api/community/groups/:id/join
router.delete('/groups/:id/join', requireAuth, async (req, res) => {
  const groupId = req.params.id;
  try {
    const { error } = await supabase
      .from('community_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', req.user.id);

    if (error) throw error;

    // Recalculate member_count
    const { count } = await supabase
      .from('community_group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    await supabase
      .from('community_groups')
      .update({ member_count: count || 0 })
      .eq('id', groupId);

    res.json({ joined: false });
  } catch (err) {
    console.error('[Community] Error leaving group:', err.message);
    res.status(500).json({ error: 'Error al salir del grupo' });
  }
});

// ════════════════════════════════════════════════════════
// POSTS
// ════════════════════════════════════════════════════════

// GET /api/community/posts?page=1&limit=20&group_id=
router.get('/posts', requireAuth, async (req, res) => {
  const page     = Math.max(1, parseInt(req.query.page)  || 1);
  const limit    = Math.min(50, parseInt(req.query.limit) || 20);
  const groupId  = req.query.group_id || null;
  const from     = (page - 1) * limit;

  try {
    let query = supabase
      .from('community_posts')
      .select('id, content, title, post_type, tickers, portfolio_context, group_id, created_at, author_email', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (groupId) query = query.eq('group_id', groupId);

    const { data: posts, error, count } = await query;
    if (error) throw error;

    const postIds = (posts || []).map(p => p.id);
    let userLikes = new Set();
    let userReactions = {};
    let reactionCounts = {};
    let commentCounts = {};

    if (postIds.length > 0) {
      // User's own reactions
      const { data: myReactions } = await supabase
        .from('community_reactions')
        .select('post_id, reaction')
        .eq('user_id', req.user.id)
        .in('post_id', postIds);
      (myReactions || []).forEach(r => { userReactions[r.post_id] = r.reaction; });

      // User's old likes (legacy)
      const { data: likes } = await supabase
        .from('community_likes')
        .select('post_id')
        .eq('user_id', req.user.id)
        .in('post_id', postIds);
      (likes || []).forEach(l => userLikes.add(l.post_id));

      // Reaction counts per post
      const { data: allReactions } = await supabase
        .from('community_reactions')
        .select('post_id, reaction')
        .in('post_id', postIds);
      (allReactions || []).forEach(r => {
        if (!reactionCounts[r.post_id]) reactionCounts[r.post_id] = { bullish: 0, bearish: 0, insightful: 0 };
        reactionCounts[r.post_id][r.reaction] = (reactionCounts[r.post_id][r.reaction] || 0) + 1;
      });

      // Comment counts
      const { data: comments } = await supabase
        .from('community_comments')
        .select('post_id')
        .in('post_id', postIds);
      (comments || []).forEach(c => {
        commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
      });
    }

    const enriched = (posts || []).map(p => ({
      id:                p.id,
      content:           p.content,
      title:             p.title,
      post_type:         p.post_type || 'text',
      tickers:           p.tickers || [],
      portfolio_context: p.portfolio_context,
      group_id:          p.group_id,
      created_at:        p.created_at,
      author_email:      p.author_email,
      reactions:         reactionCounts[p.id] || { bullish: 0, bearish: 0, insightful: 0 },
      my_reaction:       userReactions[p.id] || null,
      liked_by_me:       userLikes.has(p.id),
      comment_count:     commentCounts[p.id] || 0,
    }));

    res.json({ posts: enriched, total: count, page, limit });
  } catch (err) {
    console.error('[Community] Error getting posts:', err.message);
    res.status(500).json({ error: 'Error al obtener publicaciones' });
  }
});

// POST /api/community/posts
router.post('/posts', requireAuth, async (req, res) => {
  const { content, portfolio_context, group_id, title, post_type, tickers } = req.body;

  if (!content || content.trim().length < 10)
    return res.status(400).json({ error: 'El contenido debe tener al menos 10 caracteres' });
  if (content.length > 2000)
    return res.status(400).json({ error: 'El contenido no puede superar 2000 caracteres' });

  const validTypes = ['text', 'portfolio', 'analysis', 'alert'];
  const type = validTypes.includes(post_type) ? post_type : 'text';

  try {
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id:           req.user.id,
        author_email:      req.user.email,
        content:           content.trim(),
        portfolio_context: portfolio_context || null,
        group_id:          group_id || null,
        title:             title ? title.trim().slice(0, 200) : null,
        post_type:         type,
        tickers:           Array.isArray(tickers) ? tickers.map(t => t.toUpperCase()).slice(0, 10) : [],
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      post: {
        ...data,
        reactions: { bullish: 0, bearish: 0, insightful: 0 },
        my_reaction: null,
        comment_count: 0,
      },
    });
  } catch (err) {
    console.error('[Community] Error creating post:', err.message);
    res.status(500).json({ error: 'Error al publicar' });
  }
});

// DELETE /api/community/posts/:id
router.delete('/posts/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    console.error('[Community] Error deleting post:', err.message);
    res.status(500).json({ error: 'Error al eliminar publicación' });
  }
});

// ════════════════════════════════════════════════════════
// REACTIONS
// ════════════════════════════════════════════════════════

// POST /api/community/posts/:id/react  { reaction: 'bullish'|'bearish'|'insightful' }
router.post('/posts/:id/react', requireAuth, async (req, res) => {
  const { reaction } = req.body;
  if (!['bullish', 'bearish', 'insightful'].includes(reaction))
    return res.status(400).json({ error: 'Reacción inválida' });

  try {
    await supabase
      .from('community_reactions')
      .upsert({ post_id: req.params.id, user_id: req.user.id, reaction }, { onConflict: 'post_id,user_id' });

    const { data: counts } = await supabase
      .from('community_reactions')
      .select('reaction')
      .eq('post_id', req.params.id);

    const result = { bullish: 0, bearish: 0, insightful: 0 };
    (counts || []).forEach(r => result[r.reaction] = (result[r.reaction] || 0) + 1);

    res.json({ my_reaction: reaction, reactions: result });
  } catch (err) {
    console.error('[Community] Error reacting:', err.message);
    res.status(500).json({ error: 'Error al reaccionar' });
  }
});

// DELETE /api/community/posts/:id/react
router.delete('/posts/:id/react', requireAuth, async (req, res) => {
  try {
    await supabase
      .from('community_reactions')
      .delete()
      .eq('post_id', req.params.id)
      .eq('user_id', req.user.id);

    const { data: counts } = await supabase
      .from('community_reactions')
      .select('reaction')
      .eq('post_id', req.params.id);

    const result = { bullish: 0, bearish: 0, insightful: 0 };
    (counts || []).forEach(r => result[r.reaction] = (result[r.reaction] || 0) + 1);

    res.json({ my_reaction: null, reactions: result });
  } catch (err) {
    console.error('[Community] Error removing reaction:', err.message);
    res.status(500).json({ error: 'Error al quitar reacción' });
  }
});

// Legacy like (keep backward compat)
router.post('/posts/:id/like', requireAuth, async (req, res) => {
  try {
    await supabase.from('community_likes')
      .upsert({ post_id: req.params.id, user_id: req.user.id }, { onConflict: 'post_id,user_id' });
    const { count } = await supabase.from('community_likes').select('*', { count: 'exact', head: true }).eq('post_id', req.params.id);
    res.json({ liked: true, likes: count });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

router.delete('/posts/:id/like', requireAuth, async (req, res) => {
  try {
    await supabase.from('community_likes').delete().eq('post_id', req.params.id).eq('user_id', req.user.id);
    const { count } = await supabase.from('community_likes').select('*', { count: 'exact', head: true }).eq('post_id', req.params.id);
    res.json({ liked: false, likes: count });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

// ════════════════════════════════════════════════════════
// COMMENTS
// ════════════════════════════════════════════════════════

// GET /api/community/posts/:id/comments
router.get('/posts/:id/comments', requireAuth, async (req, res) => {
  try {
    const { data: comments, error } = await supabase
      .from('community_comments')
      .select('id, content, author_email, created_at, likes_count')
      .eq('post_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Which comments has the user liked?
    const ids = (comments || []).map(c => c.id);
    let liked = new Set();
    if (ids.length > 0) {
      const { data: cl } = await supabase.from('community_comment_likes')
        .select('comment_id').eq('user_id', req.user.id).in('comment_id', ids);
      (cl || []).forEach(l => liked.add(l.comment_id));
    }

    res.json({
      comments: (comments || []).map(c => ({
        ...c,
        liked_by_me: liked.has(c.id),
        is_mine: c.author_email === req.user.email,
      })),
    });
  } catch (err) {
    console.error('[Community] Error getting comments:', err.message);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

// POST /api/community/posts/:id/comments
router.post('/posts/:id/comments', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content || content.trim().length < 2)
    return res.status(400).json({ error: 'Comentario demasiado corto' });

  try {
    const { data, error } = await supabase
      .from('community_comments')
      .insert({
        post_id:      req.params.id,
        user_id:      req.user.id,
        author_email: req.user.email,
        content:      content.trim().slice(0, 1000),
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ comment: { ...data, liked_by_me: false, is_mine: true } });
  } catch (err) {
    console.error('[Community] Error creating comment:', err.message);
    res.status(500).json({ error: 'Error al comentar' });
  }
});

// DELETE /api/community/comments/:id
router.delete('/comments/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('community_comments')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar comentario' });
  }
});

// POST /api/community/comments/:id/like
router.post('/comments/:id/like', requireAuth, async (req, res) => {
  try {
    await supabase.from('community_comment_likes')
      .upsert({ comment_id: req.params.id, user_id: req.user.id }, { onConflict: 'comment_id,user_id' });
    const { count } = await supabase.from('community_comment_likes')
      .select('*', { count: 'exact', head: true }).eq('comment_id', req.params.id);
    await supabase.from('community_comments').update({ likes_count: count || 0 }).eq('id', req.params.id);
    res.json({ liked: true, likes: count || 0 });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

// DELETE /api/community/comments/:id/like
router.delete('/comments/:id/like', requireAuth, async (req, res) => {
  try {
    await supabase.from('community_comment_likes').delete()
      .eq('comment_id', req.params.id).eq('user_id', req.user.id);
    const { count } = await supabase.from('community_comment_likes')
      .select('*', { count: 'exact', head: true }).eq('comment_id', req.params.id);
    await supabase.from('community_comments').update({ likes_count: count || 0 }).eq('id', req.params.id);
    res.json({ liked: false, likes: count || 0 });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
