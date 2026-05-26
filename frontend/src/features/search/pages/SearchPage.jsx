// [auto] Debounced search + history
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Users, FileText, Hash, User, Globe, X } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import Avatar from '@/shared/components/Avatar.jsx';
import PostCard from '@/features/posts/components/PostCard.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/utils/cn.js';
import { useSearchHistory } from '@/features/search/hooks/useSearchHistory.js';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState('all');
  const { history, addSearch, removeSearch, clearAll } = useSearchHistory();

  const { data, isLoading } = useQuery({
    queryKey: ['search', searchParams.get('q')],
    queryFn: () => api.get('/search', { params: { q: searchParams.get('q') } }).then((r) => r.data.data),
    enabled: !!searchParams.get('q'),
  });

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      addSearch({ type: 'text', query: q });
      setSearchParams({ q });
    }
  };

  const users = data?.users || [];
  const groups = data?.groups || [];
  const posts = data?.posts || [];

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'people', label: 'People', icon: User, count: users.length },
    { id: 'groups', label: 'Groups', icon: Globe, count: groups.length },
    { id: 'posts', label: 'Posts', icon: FileText, count: posts.length },
  ];

  return (
    <div className="space-y-4">
      {/* Search input */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for people, groups, posts, hashtags..."
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
            aria-label="Search query"
          />
        </div>
        <button
          type="submit"
          className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Search
        </button>
      </form>

      {/* Results */}
      {searchParams.get('q') && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 rounded-2xl border border-border bg-card p-1">
            {tabs.map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                  activeTab === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {label} {count > 0 && <span className="ml-1 text-xs opacity-70">({count})</span>}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* People results */}
              {(activeTab === 'all' || activeTab === 'people') && users.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground px-1 mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    People
                  </h2>
                  <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                    {users.map((user) => (
                      <Link
                        key={user._id}
                        to={`/${user.username}`}
                        onClick={() =>
                          addSearch({
                            type: 'user',
                            id: user._id,
                            name: user.name,
                            username: user.username,
                            avatar: user.avatar,
                          })
                        }
                        className="flex items-center gap-3 p-4 hover:bg-accent transition-colors"
                      >
                        <Avatar src={user.avatar} name={user.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                          {user.bio && <p className="text-xs text-muted-foreground truncate mt-0.5">{user.bio}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Groups results */}
              {(activeTab === 'all' || activeTab === 'groups') && groups.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground px-1 mb-2 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Groups
                  </h2>
                  <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                    {groups.map((group) => (
                      <Link
                        key={group._id}
                        to={`/groups/${group._id}`}
                        onClick={() =>
                          addSearch({
                            type: 'group',
                            id: group._id,
                            name: group.name,
                            avatar: group.avatar,
                            privacy: group.privacy,
                          })
                        }
                        className="flex items-center gap-3 p-4 hover:bg-accent transition-colors"
                      >
                        <Avatar src={group.avatar} name={group.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Group • {group.privacy === 'private' ? 'Private' : 'Public'} • {group.membersCount || 0} members
                          </p>
                          {group.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{group.description}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts results */}
              {(activeTab === 'all' || activeTab === 'posts') && posts.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground px-1 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Posts
                  </h2>
                  <div className="space-y-3">
                    {posts.map((post) => <PostCard key={post._id} post={post} />)}
                  </div>
                </div>
              )}

              {/* No results */}
              {users.length === 0 && groups.length === 0 && posts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl border border-border bg-card p-12 text-center"
                >
                  <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-semibold text-foreground">No results found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try different keywords or check the spelling
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </>
      )}

      {/* Initial state — no query */}
      {!searchParams.get('q') && (
        <div className="space-y-4 animate-fade-in">
          {history.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground text-base">Recent Searches</h3>
                <button
                  onClick={clearAll}
                  className="text-sm font-semibold text-primary hover:underline transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
              <div className="divide-y divide-border/50">
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-3 hover:bg-accent/40 px-2 rounded-xl transition-colors"
                  >
                    <Link
                      to={
                        item.type === 'user'
                          ? `/${item.username}`
                          : item.type === 'group'
                          ? `/groups/${item.id}`
                          : `/search?q=${encodeURIComponent(item.query)}`
                      }
                      onClick={() => {
                        if (item.type === 'text') {
                          setQuery(item.query);
                          setSearchParams({ q: item.query });
                        }
                      }}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      {item.type === 'user' && (
                        <>
                          <Avatar src={item.avatar} name={item.name} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">@{item.username}</p>
                          </div>
                        </>
                      )}
                      {item.type === 'group' && (
                        <>
                          <Avatar src={item.avatar} name={item.name} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Group • {item.privacy === 'private' ? 'Private' : 'Public'}
                            </p>
                          </div>
                        </>
                      )}
                      {item.type === 'text' && (
                        <>
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Search className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{item.query}</p>
                            <p className="text-xs text-muted-foreground font-normal">Search query</p>
                          </div>
                        </>
                      )}
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        removeSearch(item);
                      }}
                      className="p-1.5 rounded-full text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground transition-colors cursor-pointer"
                      aria-label="Remove search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-semibold text-foreground">Search Nova</p>
              <p className="text-sm text-muted-foreground mt-1">Find people, groups, posts, and trending topics</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
