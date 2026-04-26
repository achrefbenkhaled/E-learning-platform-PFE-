import { CommunityPost, Comment } from '../models/Community.js';
import User from '../models/User.js';
import { escapeRegex } from '../middleware/validate.js';

export const getPosts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    let filter = {};

    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: 'i' } },
        { content: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const posts = await CommunityPost.find(filter)
      .populate('authorId', 'firstName lastName avatar')
      .populate('comments.authorId', 'firstName lastName avatar')
      .limit(limit)
      .skip(skip)
      .sort({ isPinned: -1, createdAt: -1 });

    const total = await CommunityPost.countDocuments(filter);

    res.json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

export const getPost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId)
      .populate('authorId', 'firstName lastName avatar')
      .populate('comments.authorId', 'firstName lastName avatar');
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Increment views
    post.views = (post.views || 0) + 1;
    await post.save();

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

export const createPost = async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' });
    }

    const post = new CommunityPost({
      authorId: req.userId,
      title,
      content,
      category,
      tags: tags || [],
    });

    await post.save();
    await post.populate('authorId', 'firstName lastName avatar');

    res.status(201).json({ message: 'Post created', post });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

export const updatePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    const { title, content, category, tags } = req.body;
    if (title) post.title = title;
    if (content) post.content = content;
    if (category) post.category = category;
    if (tags) post.tags = tags;

    await post.save();
    const updated = await CommunityPost.findById(post._id)
      .populate('authorId', 'firstName lastName avatar')
      .populate('comments.authorId', 'firstName lastName avatar');
    res.json(updated);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.authorId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await CommunityPost.findByIdAndDelete(req.params.postId);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

export const likePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const alreadyLiked = post.likes.includes(req.userId);
    if (alreadyLiked) {
      post.likes = post.likes.filter(id => id.toString() !== req.userId);
    } else {
      post.likes.push(req.userId);
    }

    await post.save();
    res.json({ message: alreadyLiked ? 'Unliked' : 'Liked', likes: post.likes.length });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
};

export const addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    const post = await CommunityPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = {
      authorId: req.userId,
      content,
    };

    post.comments.push(comment);
    await post.save();
    await post.populate('comments.authorId', 'firstName lastName avatar');

    res.status(201).json({ message: 'Comment added', post });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    const post = await CommunityPost.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (comment.authorId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    post.comments.id(commentId).deleteOne();
    await post.save();

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};
