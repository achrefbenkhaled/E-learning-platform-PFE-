import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../utils/api';
import { timeAgo, formatDate } from '../../utils/helpers.js';
import { CATEGORY_COLORS } from '../../utils/constants.js';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ArrowLeft, Heart, MessageCircle, Eye, Clock, Pin, Send } from 'lucide-react';
import gsap from 'gsap';

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const postCardRef = useRef(null);
  const commentsRef = useRef(null);

  // GSAP entrance animation
  useEffect(() => {
    if (!loading && post && postCardRef.current) {
      gsap.fromTo(postCardRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    }
    if (!loading && post && commentsRef.current) {
      gsap.fromTo(commentsRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out', delay: 0.3 }
      );
    }
  }, [loading, post]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data } = await api.get(`/api/community/posts/${postId}`);
        setPost(data.post || data);
      } catch (err) {
        console.error('Failed to fetch post:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  const handleLike = async () => {
    try {
      await api.post(`/api/community/posts/${postId}/like`);
      setPost((prev) => {
        if (!prev) return prev;
        const alreadyLiked = prev.likes?.includes(user?._id);
        return {
          ...prev,
          likes: alreadyLiked
            ? prev.likes.filter((id) => id !== user?._id)
            : [...(prev.likes || []), user?._id],
        };
      });
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      const { data } = await api.post(`/api/community/posts/${postId}/comments`, {
        content: comment,
      });
      setPost(data.post);
      setComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-txt-secondary text-lg mb-4">Post not found</p>
          <button
            onClick={() => navigate('/community')}
            className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
          >
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  const author = post.authorId || {};
  const isLiked = post.likes?.includes(user?._id);
  const initial = author.firstName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/community')}
          className="flex items-center gap-2 text-sm text-txt-muted hover:text-yellow-400 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Community</span>
        </button>

        {/* Post Card */}
        <div ref={postCardRef} className="bg-surface-card border-2 border-bdr rounded-2xl p-6 mb-6">
          {/* Author Info */}
          <div className="flex items-start gap-4 mb-5">
            <div className="w-11 h-11 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400 text-sm font-bold flex-shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <Link to={`/users/${author._id}`} className="font-semibold text-txt hover:text-yellow-400 transition-colors">
                {author.firstName} {author.lastName}
              </Link>
              <div className="flex items-center gap-2 text-xs text-txt-muted">
                <span>Joined {formatDate(author.createdAt || post.createdAt)}</span>
                <span className="text-txt-muted">&middot;</span>
                <Clock className="w-3 h-3" />
                <span>{timeAgo(post.createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {post.isPinned && (
                <span className="badge badge-accent flex items-center gap-1">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              )}
              <span className={`badge ${CATEGORY_COLORS[post.category] || 'badge-blue'}`}>
                {post.category}
              </span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-txt mb-3">{post.title}</h1>

          {/* Content */}
          <div className="text-txt-secondary leading-relaxed whitespace-pre-wrap mb-6 text-sm">
            {post.content}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-5 pt-4 border-t border-bdr">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                isLiked ? 'text-red-400' : 'text-txt-muted hover:text-red-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span>{post.likes?.length || 0} {post.likes?.length === 1 ? 'Like' : 'Likes'}</span>
            </button>

            <div className="flex items-center gap-2 text-sm text-txt-muted">
              <MessageCircle className="w-4 h-4" />
              <span>{post.comments?.length || 0} Comments</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-txt-muted">
              <Eye className="w-4 h-4" />
              <span>{post.views || 0} Views</span>
            </div>
          </div>
        </div>

        {/* Comment Form */}
        <div className="bg-surface-card border-2 border-bdr rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-txt mb-3">Add a Comment</h3>
          <form onSubmit={handleComment}>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              maxLength={2000}
              className="w-full px-4 py-3 bg-surface-input border-2 border-bdr rounded-xl text-sm text-txt placeholder-txt-muted
                         focus:outline-none focus:border-yellow-400/50 transition-all resize-none mb-3"
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !comment.trim()}
                className="bg-yellow-400 text-black px-5 py-2 rounded-xl text-sm font-semibold
                           border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                           hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]
                           transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </form>
        </div>

        {/* Comments List */}
        <div>
          <h3 className="text-sm font-semibold text-txt mb-4">
            Comments ({post.comments?.length || 0})
          </h3>

          {(!post.comments || post.comments.length === 0) ? (
            <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 text-center">
              <MessageCircle className="w-8 h-8 text-txt-muted mx-auto mb-2" />
              <p className="text-txt-muted text-sm">No comments yet. Start the conversation!</p>
            </div>
          ) : (
            <div ref={commentsRef} className="space-y-3">
              {post.comments.map((c) => {
                const cAuthor = c.authorId || {};
                const cInitial = cAuthor.firstName?.charAt(0)?.toUpperCase() || '?';
                return (
                  <div
                    key={c._id}
                    className="bg-surface-card border-2 border-bdr rounded-xl p-4 hover:border-bdr-hover transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 text-xs font-bold flex-shrink-0">
                        {cInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link to={`/users/${cAuthor._id}`} className="text-sm font-medium text-txt hover:text-yellow-400 transition-colors">
                            {cAuthor.firstName} {cAuthor.lastName}
                          </Link>
                          <div className="flex items-center gap-1 text-xs text-txt-muted">
                            <Clock className="w-3 h-3" />
                            {timeAgo(c.createdAt)}
                          </div>
                        </div>
                        <p className="text-sm text-txt-secondary leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
