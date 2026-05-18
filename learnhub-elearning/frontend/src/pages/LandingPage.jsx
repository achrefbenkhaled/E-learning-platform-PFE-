import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import api from '../utils/api.js';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [scrollY, setScrollY] = useState(0);
  const [visibleSections, setVisibleSections] = useState({});
  const [courses, setCourses] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.roles?.includes('admin')) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, navigate, user]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoadingCourses(true);
        const { data } = await api.get('/api/courses?limit=3');
        setCourses(data.courses);
      } catch (err) {
        console.error('Failed to fetch landing page courses:', err);
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isLoadingCourses]);

  const isVisible = (id) => visibleSections[id];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* ========== NAVBAR ========== */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrollY > 50 ? 'bg-[#0a0a0a]/95 backdrop-blur-md border-b-2 border-yellow-500/20' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center rotate-[-3deg] shadow-lg shadow-indigo-500/20">
              <span className="text-white font-black text-lg">L</span>
            </div>
            <span className="text-2xl font-black tracking-tight">
              Learn<span className="text-indigo-500">Hub</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-yellow-400 font-bold transition-colors text-sm uppercase tracking-wider">Features</a>
            <a href="#courses" className="text-gray-400 hover:text-yellow-400 font-bold transition-colors text-sm uppercase tracking-wider">Courses</a>
            <a href="#community" className="text-gray-400 hover:text-yellow-400 font-bold transition-colors text-sm uppercase tracking-wider">Community</a>
            <a href="#testimonials" className="text-gray-400 hover:text-yellow-400 font-bold transition-colors text-sm uppercase tracking-wider">Reviews</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 text-sm font-bold text-white hover:text-indigo-400 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-2.5 bg-indigo-600 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:translate-y-0"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative">
          {/* Left content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-indigo-400 font-bold text-sm">1,200+ Active Learners</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight">
              Learn.
              <br />
              <span className="text-indigo-500 relative inline-block">
                Build.
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                  <path d="M2 8 C50 2, 150 2, 198 8" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
              <br />
              <span className="text-gray-500">Grow.</span>
            </h1>

            <p className="text-lg text-gray-400 max-w-md leading-relaxed">
              The community-first learning platform where you don't just watch courses — you <span className="text-white font-bold">connect</span>, <span className="text-white font-bold">collaborate</span>, and <span className="text-white font-bold">level up</span> together.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/register')}
                className="group px-8 py-4 bg-indigo-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-500/25 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:translate-y-0"
              >
                Start Learning Free
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white/5 text-white font-bold text-lg rounded-2xl border-2 border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
              >
                See How It Works
              </button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-3">
                {['🧑‍💻', '👩‍🎓', '🧑‍🔬', '👨‍🏫', '👩‍💼'].map((emoji, i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-[#1a1a1a] border-2 border-yellow-400/30 flex items-center justify-center text-lg">
                    {emoji}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-sm">★</span>)}
                </div>
                <p className="text-gray-500 text-sm font-medium">Loved by <span className="text-white">1,200+</span> students</p>
              </div>
            </div>
          </div>

          {/* Right - Hero illustration card */}
          <div className="relative hidden lg:block">
            <div className="relative">
              {/* Main card */}
              <div className="bg-[#1a1a1a] rounded-3xl border border-white/10 p-8 shadow-2xl shadow-indigo-500/10 rotate-[2deg] hover:rotate-0 transition-transform duration-500">
                {/* Mini course card */}
                <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-2xl">📚</div>
                    <div>
                      <p className="font-black text-white">React Bootcamp</p>
                      <p className="text-gray-500 text-sm font-medium">Sarah Johnson</p>
                    </div>
                    <div className="ml-auto bg-indigo-500/10 text-indigo-400 font-bold text-sm px-3 py-1 rounded-lg">FREE</div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-[68%] bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full" />
                  </div>
                  <p className="text-right text-sm text-gray-500 mt-2 font-bold">68% Complete</p>
                </div>

                {/* Chat preview */}
                <div className="bg-[#0a0a0a] rounded-2xl border-2 border-white/10 p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <p className="text-sm font-bold text-gray-400">Live Chat</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2 items-start">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs flex-shrink-0">E</div>
                      <div className="bg-white/5 rounded-xl rounded-tl-none px-3 py-2 text-sm text-gray-300">Anyone done the hooks section? 🔥</div>
                    </div>
                    <div className="flex gap-2 items-start justify-end">
                      <div className="bg-indigo-500/20 rounded-xl rounded-tr-none px-3 py-2 text-sm text-indigo-200">Just finished! It's great 💪</div>
                      <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs flex-shrink-0 text-white font-bold">A</div>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { num: '50+', label: 'Courses', emoji: '📖' },
                    { num: '1.2K', label: 'Students', emoji: '👥' },
                    { num: '98%', label: 'Rating', emoji: '⭐' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-[#0a0a0a] rounded-xl border-2 border-white/5 p-3 text-center">
                      <p className="text-lg mb-1">{stat.emoji}</p>
                      <p className="font-black text-white">{stat.num}</p>
                      <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-6 -left-6 bg-indigo-600 text-white font-black px-4 py-2 rounded-xl shadow-xl shadow-indigo-500/30 rotate-[-8deg] animate-bounce-slow">
                100% Free Start ✨
              </div>
              <div className="absolute -bottom-4 -right-4 bg-white text-black font-black px-4 py-2 rounded-xl shadow-xl rotate-[5deg]">
                Real-time Chat 💬
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-gray-600 text-sm font-medium">Scroll</span>
          <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-indigo-500 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* ========== BRANDS / TRUST BAR ========== */}
      <section className="border-y-2 border-white/5 py-8 bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-gray-600 text-sm font-bold uppercase tracking-widest mb-6">Students from top companies learn here</p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-30">
            {['GOOGLE', 'MICROSOFT', 'META', 'AMAZON', 'NETFLIX', 'SPOTIFY'].map((brand) => (
              <span key={brand} className="text-xl font-black tracking-wider text-white">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div
            id="features-header"
            data-animate
            className={`text-center mb-20 transition-all duration-700 ${isVisible('features-header') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <div className="inline-block bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 mb-6">
              <span className="text-indigo-400 font-bold text-sm uppercase tracking-wider">Why LearnHub?</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              Not Your Average <span className="text-indigo-500">LMS</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              We built the platform we wished existed. Community-first, no fluff, just real learning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                emoji: '🎬',
                title: 'Video Courses',
                desc: 'Watch high-quality sessions, track your progress, and pick up where you left off. No downloads needed.',
                color: 'yellow',
              },
              {
                emoji: '💬',
                title: 'Live Chat Rooms',
                desc: 'Real-time messaging with fellow learners. Ask questions, share wins, and build connections.',
                color: 'blue',
              },
              {
                emoji: '📝',
                title: 'Timed Tests',
                desc: 'Take synchronized online tests with live timers. Auto-submit, reconnection handling, instant results.',
                color: 'green',
              },
              {
                emoji: '👥',
                title: 'Community Feed',
                desc: 'Post discussions, share resources, ask questions. Like a social network, but for learners.',
                color: 'purple',
              },
              {
                emoji: '🎓',
                title: 'Create & Teach',
                desc: 'Anyone can create courses. Share your knowledge, build an audience, and help others grow.',
                color: 'pink',
              },
              {
                emoji: '🛡️',
                title: 'Admin Dashboard',
                desc: 'Full control panel for managing users, courses, and content. Analytics at your fingertips.',
                color: 'orange',
              },
            ].map((feature, i) => (
              <div
                key={i}
                id={`feature-${i}`}
                data-animate
                className={`group bg-[#1a1a1a] rounded-2xl border border-white/5 p-8 hover:border-indigo-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/10 ${
                  isVisible(`feature-${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-110 group-hover:rotate-[-5deg] transition-transform border border-indigo-500/20">
                  {feature.emoji}
                </div>
                <h3 className="text-xl font-black mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="py-32 bg-[#0f0f0f] border-y-2 border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div
            id="how-header"
            data-animate
            className={`text-center mb-20 transition-all duration-700 ${isVisible('how-header') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              Three Steps to <span className="text-indigo-500">Level Up</span>
            </h2>
            <p className="text-gray-500 text-lg">Dead simple. No credit card. No BS.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Sign Up Free', desc: 'Create your account in 10 seconds. No payment required to start learning.', emoji: '🚀' },
              { step: '02', title: 'Pick a Course', desc: 'Browse courses from real instructors. Free and premium options. Start watching instantly.', emoji: '📚' },
              { step: '03', title: 'Join the Community', desc: 'Chat with learners, post in the feed, take tests, and track your growth.', emoji: '🎯' },
            ].map((item, i) => (
              <div
                key={i}
                id={`step-${i}`}
                data-animate
                className={`relative text-center transition-all duration-700 ${
                  isVisible(`step-${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${i * 200}ms` }}
              >
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] border-t-2 border-dashed border-indigo-500/20" />
                )}
                <div className="w-20 h-20 bg-indigo-600 text-white font-black text-3xl rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20 rotate-[-3deg] hover:rotate-[3deg] transition-transform">
                  {item.emoji}
                </div>
                <div className="text-indigo-400 font-black text-sm tracking-widest mb-2">{item.step}</div>
                <h3 className="text-2xl font-black mb-3">{item.title}</h3>
                <p className="text-gray-500 max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== COURSE SHOWCASE ========== */}
      <section id="courses" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div
            id="courses-header"
            data-animate
            className={`text-center mb-16 transition-all duration-700 ${isVisible('courses-header') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              Popular <span className="text-indigo-500">Courses</span>
            </h2>
            <p className="text-gray-500 text-lg">Hand-picked courses from expert instructors</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingCourses ? (
              // Loading skeletons
              [1, 2, 3].map((n) => (
                <div key={n} className="bg-[#1a1a1a] rounded-2xl border-[3px] border-white/5 h-96 animate-pulse" />
              ))
            ) : courses.length > 0 ? (
              courses.map((course, i) => {
                const colors = [
                  'from-blue-500/20 to-cyan-500/20',
                  'from-green-500/20 to-emerald-500/20',
                  'from-purple-500/20 to-pink-500/20',
                  'from-yellow-500/20 to-orange-500/20',
                  'from-red-500/20 to-pink-500/20'
                ];
                const emojis = ['⚛️', '🐍', '🎨', '🚀', '🧠', '📊', '🌐'];
                const emoji = emojis[i % emojis.length];
                const color = colors[i % colors.length];

                return (
                  <div
                    key={course._id}
                    id={`course-${i}`}
                    data-animate
                    className={`group bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden hover:border-indigo-500/30 transition-all duration-500 hover:-translate-y-2 ${
                      isVisible(`course-${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                    }`}
                    style={{ transitionDelay: `${i * 150}ms` }}
                  >
                    <div className={`h-44 overflow-hidden bg-gradient-to-br ${color} flex items-center justify-center text-6xl group-hover:scale-105 transition-transform duration-500`}>
                      {course.thumbnail ? (
                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <span>{emoji}</span>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-2.5 py-1 rounded-lg uppercase">{course.level}</span>
                        <span className="text-gray-600 text-xs">•</span>
                        <span className="text-gray-500 text-xs font-medium">{course.totalEnrollments || 0} students</span>
                      </div>
                      <h3 className="text-lg font-black text-white mb-2 group-hover:text-indigo-400 transition-colors line-clamp-1">{course.title}</h3>
                      <p className="text-gray-500 text-sm mb-4">by {course.instructor?.firstName} {course.instructor?.lastName}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <span className={`font-black text-lg ${course.price === 0 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                          {course.price === 0 ? 'Free' : `$${course.price}`}
                        </span>
                        <button
                          onClick={() => navigate('/register')}
                          className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
                        >
                          Enroll →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
                <p className="text-gray-500 font-bold">New courses arriving soon! 🚀</p>
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-white/5 text-white font-bold rounded-2xl border-2 border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
            >
              Browse All Courses →
            </button>
          </div>
        </div>
      </section>

      {/* ========== COMMUNITY PREVIEW ========== */}
      <section id="community" className="py-32 bg-[#0f0f0f] border-y-2 border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div
              id="community-text"
              data-animate
              className={`transition-all duration-700 ${isVisible('community-text') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            >
              <div className="inline-block bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 mb-6">
                <span className="text-indigo-400 font-bold text-sm uppercase tracking-wider">Community</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
                Learning is Better <span className="text-indigo-500">Together</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Our community feed is where the magic happens. Share your projects, ask questions, help others, and build real connections with fellow learners.
              </p>
              <div className="space-y-4">
                {[
                  'Post discussions, questions, and resources',
                  'Real-time chat rooms for every topic',
                  'Like, comment, and engage with peers',
                  'Build your learning network',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-black">✓</span>
                    </div>
                    <span className="text-gray-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Community mockup */}
            <div
              id="community-card"
              data-animate
              className={`transition-all duration-700 delay-200 ${isVisible('community-card') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            >
              <div className="bg-[#1a1a1a] rounded-3xl border border-white/10 p-6 shadow-2xl shadow-indigo-500/10 rotate-[-1deg] hover:rotate-0 transition-transform duration-500">
                {/* Post */}
                <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 p-5 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">M</div>
                    <div>
                      <p className="font-bold text-white text-sm">Mike Chen</p>
                      <p className="text-gray-600 text-xs">2 hours ago</p>
                    </div>
                    <span className="ml-auto bg-green-400/10 text-green-400 text-xs font-bold px-2 py-1 rounded-lg">Resource</span>
                  </div>
                  <h4 className="font-black text-white mb-2">Free resources for learning Data Science</h4>
                  <p className="text-gray-500 text-sm mb-3">Here are some amazing free resources I've collected over the years: Kaggle, Google Colab, fast.ai...</p>
                  <div className="flex items-center gap-4 text-gray-600 text-sm">
                    <span className="flex items-center gap-1 hover:text-indigo-400 cursor-pointer transition-colors">
                      <span className="text-indigo-400">❤️</span> 42
                    </span>
                    <span className="flex items-center gap-1">💬 12</span>
                    <span className="flex items-center gap-1">👁 365</span>
                  </div>
                </div>

                {/* Comment */}
                <div className="bg-[#0a0a0a] rounded-2xl border-2 border-white/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-bold">L</div>
                    <p className="font-bold text-white text-sm">Lisa Park</p>
                    <p className="text-gray-600 text-xs">1h ago</p>
                  </div>
                  <p className="text-gray-400 text-sm">StatQuest is amazing! Josh Starmer explains everything so clearly. Also adding: 3Blue1Brown 🔥</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section id="testimonials" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div
            id="testimonials-header"
            data-animate
            className={`text-center mb-16 transition-all duration-700 ${isVisible('testimonials-header') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              What Students <span className="text-indigo-500">Say</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Emma Wilson',
                role: 'Frontend Developer',
                text: 'LearnHub changed the way I learn. The community aspect makes it feel like you have study buddies 24/7. Completed 3 courses in a month!',
                avatar: 'E',
              },
              {
                name: 'Alex Rivera',
                role: 'Full-Stack Developer',
                text: 'The real-time chat and test features are incredible. I took a timed JavaScript exam with 50 other students, and the sync was flawless.',
                avatar: 'A',
              },
              {
                name: 'Lisa Park',
                role: 'CS Student',
                text: 'As someone who learns best with others, this platform is perfect. The community feed keeps me motivated and the courses are top-notch.',
                avatar: 'L',
              },
            ].map((review, i) => (
              <div
                key={i}
                id={`review-${i}`}
                data-animate
                className={`bg-[#1a1a1a] rounded-2xl border border-white/5 p-8 hover:border-indigo-500/20 transition-all duration-500 ${
                  isVisible(`review-${i}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(s => <span key={s} className="text-indigo-400">★</span>)}
                </div>
                <p className="text-gray-300 mb-6 leading-relaxed italic">"{review.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black">
                    {review.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{review.name}</p>
                    <p className="text-gray-500 text-xs">{review.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== STATS BAR ========== */}
      <section className="py-20 bg-[#0f0f0f] border-y-2 border-white/5">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          { [
            { num: '50+', label: 'Expert Courses' },
            { num: '1,200+', label: 'Active Students' },
            { num: '10K+', label: 'Tests Completed' },
            { num: '98%', label: 'Satisfaction Rate' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-4xl font-black text-indigo-500 mb-1">{stat.num}</p>
              <p className="text-gray-500 font-medium text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div
            id="cta"
            data-animate
            className={`transition-all duration-700 ${isVisible('cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <div className="bg-[#1a1a1a] rounded-3xl border border-indigo-500/20 p-12 md:p-20 relative overflow-hidden">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-indigo-500/5" />

              <div className="relative">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 leading-tight">
                  Ready to Start<br />
                  <span className="text-indigo-500">Learning?</span>
                </h2>
                <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto">
                  Join thousands of learners already growing their skills. It's free to start, and you'll never learn alone again.
                </p>
                <button
                  onClick={() => navigate('/register')}
                  className="px-10 py-5 bg-indigo-600 text-white font-black text-xl rounded-2xl shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:translate-y-0"
                >
                  Create Free Account →
                </button>
                <p className="text-gray-600 text-sm mt-6">No credit card required • Free forever plan</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="border-t-2 border-white/5 bg-[#0a0a0a] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-sm">L</span>
                </div>
                <span className="text-xl font-black">Learn<span className="text-indigo-600">Hub</span></span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                The community-first learning platform. Built for learners, by learners.
              </p>
            </div>
            {[
              { title: 'Platform', links: ['Browse Courses', 'Community Feed', 'Live Chat', 'Online Tests'] },
              { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Contact'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className="text-gray-600 hover:text-indigo-500 transition-colors text-sm font-medium">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-700 text-sm">© 2026 LearnHub. All rights reserved.</p>
            <div className="flex gap-6">
              {['Twitter', 'GitHub', 'Discord', 'LinkedIn'].map((social) => (
                <a key={social} href="#" className="text-gray-600 hover:text-indigo-500 transition-colors text-sm font-medium">{social}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) rotate(-8deg); }
          50% { transform: translateY(-8px) rotate(-8deg); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
