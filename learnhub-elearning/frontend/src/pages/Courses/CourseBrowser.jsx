import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { Search, BookOpen, SlidersHorizontal, ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import api from '../../utils/api.js';
import { COURSE_CATEGORIES, COURSE_LEVELS } from '../../utils/constants.js';
import useAuth from '../../hooks/useAuth.js';
import CourseCard from '../../components/course/CourseCard.jsx';

const PRICE_OPTIONS = ['All', 'Free', 'Paid'];
const PAGE_SIZE = 9;

const CourseBrowser = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const cardsRef = useRef(null);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: 'All Categories',
    level: 'All Levels',
    price: 'All',
  });

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page: currentPage, limit: PAGE_SIZE };
      if (filters.search) params.search = filters.search;
      if (filters.category !== 'All Categories') params.category = filters.category;
      if (filters.level !== 'All Levels') params.level = filters.level;
      if (filters.price === 'Free') params.price = 0;
      if (filters.price === 'Paid') params.minPrice = 1;

      const res = await api.get('/api/courses', { params });
      setCourses(res.data.courses || res.data || []);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // GSAP stagger animation on cards
  useEffect(() => {
    if (!loading && courses.length > 0 && cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('.course-card-item');
      gsap.fromTo(
        cards,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out' }
      );
    }
  }, [loading, courses]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', category: 'All Categories', level: 'All Levels', price: 'All' });
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filters.search || filters.category !== 'All Categories' || filters.level !== 'All Levels' || filters.price !== 'All';

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="border-b border-bdr">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-txt mb-2">Explore Courses</h1>
            <p className="text-lg text-txt-muted">
              Discover courses taught by expert instructors and level up your skills
            </p>
          </div>
          {user?.roles?.includes('instructor') && (
            <button
              onClick={() => navigate('/courses/create')}
              className="btn-primary inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Create Course
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-bdr">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <span className="px-5 py-3 text-sm font-semibold text-yellow-400 relative cursor-default">
              Discover Courses
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 rounded-t" />
            </span>
            <Link to="/courses/my" className="px-5 py-3 text-sm font-semibold text-txt-muted hover:text-txt-secondary transition-colors">
              My Courses
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter Bar */}
        <div className="card p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold text-txt">Filters</span>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-txt-muted hover:text-yellow-400 transition-colors">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
              <input
                type="text"
                placeholder="Search courses..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input-field pl-12"
              />
            </div>

            {/* Category */}
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="input-field"
            >
              {['All Categories', ...COURSE_CATEGORIES].map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Level */}
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="input-field"
            >
              {['All Levels', ...COURSE_LEVELS].map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>

            {/* Price */}
            <div className="flex gap-2">
              {PRICE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleFilterChange('price', opt)}
                  className={`flex-1 px-3 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                    filters.price === opt
                      ? 'bg-yellow-400 text-black border-black shadow-brutal-sm'
                      : 'bg-surface-input text-txt-secondary border-bdr hover:border-gray-600'
                  }`}
                >
                  {opt === 'All' ? 'All' : opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 bg-red-400/10 border border-red-400/20 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-bdr border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 bg-surface-card rounded-2xl border-2 border-bdr flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-txt-muted" />
            </div>
            <h3 className="text-xl font-bold text-txt mb-2">No courses found</h3>
            <p className="text-txt-muted mb-6">
              Try adjusting your filters or search terms to find what you're looking for.
            </p>
            <button onClick={clearFilters} className="btn-secondary">
              Clear Filters
            </button>
          </div>
        ) : (
          /* Course grid */
          <>
            <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div key={course._id} className="course-card-item opacity-0">
                  <CourseCard course={course} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="p-2.5 rounded-xl border-2 border-bdr text-txt-secondary hover:border-yellow-400/50 hover:text-yellow-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all duration-200 border-2 ${
                      currentPage === page
                        ? 'bg-yellow-400 text-black border-black shadow-brutal-sm'
                        : 'text-txt-muted border-bdr hover:border-gray-600 hover:text-txt'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-2.5 rounded-xl border-2 border-bdr text-txt-secondary hover:border-yellow-400/50 hover:text-yellow-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CourseBrowser;
