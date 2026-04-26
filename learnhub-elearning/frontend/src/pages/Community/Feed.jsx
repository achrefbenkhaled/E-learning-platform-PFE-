import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../utils/api';
import PostCard from '../../components/community/PostCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Plus, X, Filter, MessageSquare, Sparkles } from 'lucide-react';
import gsap from 'gsap';

const CATEGORIES = [
  { key: '', label: 'All Posts' },
  { key: 'discussion', label: 'Discussions' },
  { key: 'question', label: 'Questions' },
  { key: 'announcement', label: 'Announcements' },
  { key: 'resource', label: 'Resources' },
];

const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'discussion' });
  const [creating, setCreating] = useState(false);

  const postsContainerRef = useRef(null);
  const headerRef = useRef(null);
  const filtersRef = useRef(null);

  // GSAP entrance for header
  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    }
    if (filtersRef.current) {
      gsap.fromTo(filtersRef.current.children,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.2 }
      );
    }
  }, []);

  // GSAP stagger on posts
  useEffect(() => {
    if (!loading && postsContainerRef.current && posts.length > 0) {
      gsap.fromTo(postsContainerRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' }
      );
    }
  }, [loading, posts]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (activeCategory) params.category = activeCategory;
      const { data } = await api.get('/api/community/posts', { params });
      setPosts(data.posts);
      setTotalPages(data.pages);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setPage(1);
  };

  const handleLike = async (postId) => {
    try {
      await api.post(`/api/community/posts/${postId}/like`);
      setPosts((prev) =>
        prev.map((p) => {
          if (p._id === postId) {
            const alreadyLiked = p.likes?.includes(user?._id);
            return {
              ...p,
              likes: alreadyLiked
                ? p.likes.filter((id) => id !== user?._id)
                : [...(p.likes || []), user?._id],
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) return;

    setCreating(true);
    try {
      const { data } = await api.post('/api/community/posts', newPost);
      setPosts((prev) => [data.post, ...prev]);
      setNewPost({ title: '', content: '', category: 'discussion' });
      setShowNewPost(false);
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div ref={headerRef} className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <MessageSquare className="w-7 h-7 text-yellow-400" />
              <h1 className="text-2xl font-bold text-txt">Community</h1>
            </div>
            <p className="text-sm text-txt-muted ml-10">
              Join the conversation with fellow learners
            </p>
          </div>
          <button
            onClick={() => setShowNewPost(true)}
            className="bg-yellow-400 text-black px-5 py-2.5 rounded-xl font-semibold text-sm
                       border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                       hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]
                       transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>

        {/* Filter Pills */}
        <div ref={filtersRef} className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 border-2 ${
                activeCategory === cat.key
                  ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/50'
                  : 'bg-surface-card text-txt-secondary border-bdr hover:border-bdr-hover hover:text-txt-secondary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* New Post Modal */}
        {showNewPost && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface-card border-2 border-bdr rounded-2xl w-full max-w-lg p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-lg font-bold text-txt">Create a Post</h2>
                </div>
                <button
                  onClick={() => setShowNewPost(false)}
                  className="text-txt-muted hover:text-txt transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-txt-secondary mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))}
                    placeholder="What's on your mind?"
                    maxLength={200}
                    className="w-full px-4 py-2.5 bg-surface-input border-2 border-bdr rounded-xl text-sm text-txt placeholder-txt-muted
                               focus:outline-none focus:border-yellow-400/50 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-txt-secondary mb-1.5">
                    Content
                  </label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost((p) => ({ ...p, content: e.target.value }))}
                    placeholder="Share your thoughts, questions, or resources..."
                    rows={5}
                    maxLength={10000}
                    className="w-full px-4 py-2.5 bg-surface-input border-2 border-bdr rounded-xl text-sm text-txt placeholder-txt-muted
                               focus:outline-none focus:border-yellow-400/50 transition-all resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-txt-secondary mb-1.5">
                    Category
                  </label>
                  <select
                    value={newPost.category}
                    onChange={(e) => setNewPost((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-surface-input border-2 border-bdr rounded-xl text-sm text-txt
                               focus:outline-none focus:border-yellow-400/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="discussion">Discussion</option>
                    <option value="question">Question</option>
                    <option value="announcement">Announcement</option>
                    <option value="resource">Resource</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewPost(false)}
                    className="px-4 py-2.5 text-sm font-medium text-txt-secondary border-2 border-bdr rounded-xl
                               hover:border-bdr-hover hover:text-txt-secondary transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2.5 bg-yellow-400 text-black text-sm font-semibold rounded-xl
                               border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                               hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]
                               transition-all disabled:opacity-50"
                  >
                    {creating ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-12 h-12 text-txt-muted mx-auto mb-3" />
            <p className="text-txt-secondary text-lg mb-2">No posts yet</p>
            <p className="text-txt-muted text-sm">Be the first to start a conversation!</p>
          </div>
        ) : (
          <div ref={postsContainerRef} className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onLike={handleLike}
                currentUserId={user?._id}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-txt-secondary bg-surface-card border-2 border-bdr rounded-xl
                         hover:border-bdr-hover hover:text-txt-secondary transition-all disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-txt-muted">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-medium text-txt-secondary bg-surface-card border-2 border-bdr rounded-xl
                         hover:border-bdr-hover hover:text-txt-secondary transition-all disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
