import React, { useEffect, useState } from 'react';
import { Trophy, Target, Users, RotateCw, UserPlus, Calendar, Clock, CalendarRange, Film, Tv, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type RankingType = 'general' | 'monthly' | 'weekly' | 'semester' | 'genre' | 'channel';

interface LeaderboardEntry extends RankingEntry {
  id: string;
}

interface RankingEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_score: number;
  precision_score: number;
  rank: number;
  predictions_count: number;
  trend?: 'up' | 'down' | 'new' | null;
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
}

interface PlayerRowProps {
  rank: number;
  username: string;
  avatarUrl?: string | null;
  points: number;
  precision: string;
  predictionsCount: number;
  isOnline?: boolean;
}

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1: return 'text-yellow-500';
    case 2: return 'text-gray-400';
    case 3: return 'text-amber-600';
    default: return 'text-gray-500 dark:text-gray-400';
  }
};

const getBgColor = (username: string) => {
  const colors = [
    'bg-red-500',
    'bg-purple-500',
    'bg-blue-500',
    'bg-green-500'
  ];
  const index = username.length % colors.length;
  return colors[index];
};

const StatCard = ({ icon, title, value, subtitle }: StatCardProps) => (
  <div className="bg-white dark:bg-[#1B2028] rounded-lg p-6 shadow-sm">
    <div className="text-purple-500 mb-4">{icon}</div>
    <div className="text-gray-500 dark:text-gray-400 text-sm">{title}</div>
    <div className="text-gray-900 dark:text-white text-3xl font-bold mb-1">{value}</div>
    {subtitle && <div className="text-gray-500 dark:text-gray-400 text-sm mt-1">{subtitle}</div>}
  </div>
);

const PlayerRow = ({ rank, username, avatarUrl, points, precision, predictionsCount }: PlayerRowProps) => {
  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const truncateUsername = (username: string) => {
    return username.length > 12 ? username.substring(0, 12) + '...' : username;
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center space-x-4">
        <span className={`w-8 text-lg font-semibold ${getRankColor(rank)}`}>#{rank}</span>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`Avatar de ${username}`}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getBgColor(username)}`}>
            {getInitials(username)}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white" title={username}>{truncateUsername(username)}</span>
        </div>
      </div>
      <div className="flex items-center space-x-8">
        <div className="w-20 text-right">
          <div className="font-medium text-gray-900 dark:text-white">{points}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">points</div>
        </div>
        <div className="w-20 text-right">
          <div className="font-medium text-gray-900 dark:text-white">{precision}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">précision</div>
        </div>
        <div className="w-20 text-right">
          <div className="font-medium text-gray-900 dark:text-white">{predictionsCount}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">pronostics</div>
        </div>
      </div>
    </div>
  );
};

const RankingPage = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRanking, setSelectedRanking] = useState<RankingType>('general');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    topScore: 0,
    topPrecision: 0,
    activePlayers: 0,
    registeredUsers: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [topUser, setTopUser] = useState<{ username: string; score: number } | null>(null);
  const [topPrecisionUser, setTopPrecisionUser] = useState<{ username: string; precision: number } | null>(null);
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState<RankingEntry[]>([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<RankingEntry[]>([]);
  const [semesterLeaderboard, setSemesterLeaderboard] = useState<RankingEntry[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [loadingWeekly, setLoadingWeekly] = useState(true);
  const [loadingSemester, setLoadingSemester] = useState(true);
  const [loadingGenre, setLoadingGenre] = useState(true);
  const [loadingChannel, setLoadingChannel] = useState(true);
  const [genreLeaderboard, setGenreLeaderboard] = useState<RankingEntry[]>([]);
  const [channelLeaderboard, setChannelLeaderboard] = useState<RankingEntry[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('Divertissement');
  const [selectedChannel, setSelectedChannel] = useState<string>('TF1');

  const genres = [
    'Divertissement',
    'Série',
    'Film',
    'Information',
    'Sport',
    'Football',
    'Documentaire',
    'Magazine',
    'Jeunesse'
  ];

  const channels = [
    'TF1', 'France 2', 'France 3', 'Canal+', 'France 5',
    'M6', 'Arte', 'C8', 'W9', 'TMC', 'TFX', 'CSTAR',
    'Gulli', 'TF1 Séries Films', '6ter', 'RMC Story',
    'RMC Découverte', 'Chérie 25', 'L\'Équipe'
  ];

  const truncateUsername = (username: string) => {
    return username.length > 12 ? username.substring(0, 12) + '...' : username;
  };

  const fetchGenreLeaderboard = async () => {
    try {
      setLoadingGenre(true);
      setIsRefreshing(true);
      const { data, error } = await supabase
        .from('classement_par_genre') 
        .select('*')
        .eq('genre', selectedGenre)
        .order('rank', { ascending: true });

      if (error) throw error;
      setGenreLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching genre leaderboard:', error);
    } finally {
      setLoadingGenre(false);
      setIsRefreshing(false);
    }
  };

  const fetchChannelLeaderboard = async () => {
    try {
      setLoadingChannel(true);
      setIsRefreshing(true);
      const { data, error } = await supabase
        .from('classement_par_chaine')
        .select('*')
        .eq('channel', selectedChannel)
        .order('rank', { ascending: true });

      if (error) throw error;
      setChannelLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching channel leaderboard:', error);
    } finally {
      setLoadingChannel(false);
      setIsRefreshing(false);
    }
  };

  const fetchSemesterLeaderboard = async () => {
    try {
      setLoadingSemester(true);
      setIsRefreshing(true);
      const { data, error } = await supabase
        .from('semestre_user_rankings')
        .select('*')
        .order('rank', { ascending: true });

      if (error) throw error;
      setSemesterLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching semester leaderboard:', error);
    } finally {
      setLoadingSemester(false);
      setIsRefreshing(false);
    }
  };

  const fetchMonthlyLeaderboard = async () => {
    try {
      setLoadingMonthly(true);
      setIsRefreshing(true);
      const { data, error } = await supabase
        .from('classement_mois_en_cours')
        .select('*')
        .order('rank', { ascending: true });

      if (error) throw error;
      setMonthlyLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching monthly leaderboard:', error);
    } finally {
      setLoadingMonthly(false);
      setIsRefreshing(false);
    }
  };

  const fetchWeeklyLeaderboard = async () => {
    try {
      setLoadingWeekly(true);
      setIsRefreshing(true);
      const { data, error } = await supabase
        .from('classement_semaine_en_cours')
        .select('*')
        .order('rank', { ascending: true });

      if (error) throw error;
      setWeeklyLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching weekly leaderboard:', error);
    } finally {
      setLoadingWeekly(false);
      setIsRefreshing(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('classement_general')
        .select('*')
        .order('rank', { ascending: true });

      if (error) throw error;
      setLeaderboard(data || []);

      if (data && data.length > 0) {
        setStats({
          topScore: Math.max(...data.map(e => e.total_score || 0)),
          topPrecision: Math.max(...data.map(e => e.precision_score || 0)),
          activePlayers: data.filter(e => e.total_score > 0).length,
          registeredUsers: 0
        });
        
        const topScorer = data.reduce((prev, current) => 
          (prev.total_score || 0) > (current.total_score || 0) ? prev : current
        );
        setTopUser({
          username: topScorer.username,
          score: topScorer.total_score || 0
        });

        const topPrecisionScorer = data.reduce((prev, current) => 
          (prev.precision_score || 0) > (current.precision_score || 0) ? prev : current
        );
        setTopPrecisionUser({
          username: topPrecisionScorer.username,
          precision: topPrecisionScorer.precision_score || 0
        });
      }

      const { data: registeredUsersData } = await supabase
        .from('registered_users_count')
        .select('count')
        .single();

      if (registeredUsersData) {
        setStats(prev => ({
          ...prev,
          registeredUsers: registeredUsersData.count
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    fetchMonthlyLeaderboard();
    fetchWeeklyLeaderboard();
    fetchSemesterLeaderboard();
    fetchGenreLeaderboard();
    fetchChannelLeaderboard();

    const subscription = supabase
      .channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchLeaderboard();
        fetchMonthlyLeaderboard();
        fetchWeeklyLeaderboard();
        fetchSemesterLeaderboard();
        fetchGenreLeaderboard();
        fetchChannelLeaderboard();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedGenre, selectedChannel]);

  const getCurrentLeaderboard = () => {
    switch (selectedRanking) {
      case 'genre':
        return {
          data: genreLeaderboard,
          loading: loadingGenre,
          title: 'Classement'
        };
      case 'channel':
        return {
          data: channelLeaderboard,
          loading: loadingChannel,
          title: 'Classement'
        };
      case 'semester':
        return {
          data: semesterLeaderboard,
          loading: loadingSemester,
          title: 'Classement du Semestre'
        };
      case 'monthly':
        return {
          data: monthlyLeaderboard,
          loading: loadingMonthly,
          title: 'Classement du Mois'
        };
      case 'weekly':
        return {
          data: weeklyLeaderboard,
          loading: loadingWeekly,
          title: 'Classement de la Semaine'
        };
      default:
        return {
          data: leaderboard,
          loading: loading,
          title: 'Classement Général'
        };
    }
  };

  const currentLeaderboard = getCurrentLeaderboard();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6 lg:mb-8">
        Classements des joueurs
      </h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <StatCard
          icon={<Trophy size={24} />}
          title="Score le plus élevé"
          value={`${stats.topScore}`}
          subtitle={topUser?.username}
        />
        <StatCard
          icon={<Target size={24} />}
          title="Meilleure précision"
          value={`${stats.topPrecision.toFixed(1)}%`}
          subtitle={topPrecisionUser?.username}
        />
        <StatCard
          icon={<UserPlus size={24} />}
          title="Joueurs inscrits"
          value={stats.registeredUsers.toString()}
          subtitle="Participants"
        />
      </div>

      <div className="flex flex-col lg:flex-row lg:gap-6">
        <div className="flex flex-col gap-4 lg:hidden">
          <button
            onClick={() => setSelectedRanking('general')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-lg transition-colors ${
              selectedRanking === 'general'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-[#1B2028] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Trophy size={20} />
            <span className="font-medium">Classement Général</span>
          </button>

          <button
            onClick={() => setSelectedRanking('genre')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-lg transition-colors ${
              selectedRanking === 'genre'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-[#1B2028] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Film size={20} />
            <span className="font-medium">Classement par Genre</span>
          </button>

          <button
            onClick={() => setSelectedRanking('channel')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-lg transition-colors ${
              selectedRanking === 'channel'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-[#1B2028] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Tv size={20} />
            <span className="font-medium">Classement par Chaîne</span>
          </button>

          <button
            onClick={() => setSelectedRanking('semester')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-lg transition-colors ${
              selectedRanking === 'semester'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-[#1B2028] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <CalendarRange size={20} />
            <span className="font-medium">Classement du Semestre</span>
          </button>

          <button
            onClick={() => setSelectedRanking('monthly')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-lg transition-colors ${
              selectedRanking === 'monthly'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-[#1B2028] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Calendar size={20} />
            <span className="font-medium">Classement du Mois</span>
          </button>

          <button
            onClick={() => setSelectedRanking('weekly')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-lg transition-colors ${
              selectedRanking === 'weekly'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-[#1B2028] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Clock size={20} />
            <span className="font-medium">Classement de la Semaine</span>
          </button>
        </div>

        <div className="flex-grow w-full lg:w-[calc(66.666667%-0.75rem)] bg-white dark:bg-[#1B2028] rounded-lg p-4 lg:p-6 shadow-sm mt-4 lg:mt-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {currentLeaderboard.title}
              {selectedRanking === 'genre' && (
                <div className="inline-flex items-center ml-4">
                  <select
                    value={selectedGenre}
                    onChange={(e) => {
                      setSelectedGenre(e.target.value);
                      setIsRefreshing(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {genres.map((genre) => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                </div>
              )}
              {selectedRanking === 'channel' && (
                <div className="inline-flex items-center ml-4">
                  <select
                    value={selectedChannel}
                    onChange={(e) => {
                      setSelectedChannel(e.target.value);
                      setIsRefreshing(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {channels.map((channel) => (
                      <option key={channel} value={channel}>{channel}</option>
                    ))}
                  </select>
                </div>
              )}
            </h2>
            <button 
              onClick={() => {
                switch (selectedRanking) {
                  case 'genre':
                    fetchGenreLeaderboard();
                    break;
                  case 'channel':
                    fetchChannelLeaderboard();
                    break;
                  case 'monthly':
                    fetchMonthlyLeaderboard();
                    break;
                  case 'semester':
                    fetchSemesterLeaderboard();
                    break;
                  case 'weekly':
                    fetchWeeklyLeaderboard();
                    break;
                  default:
                    fetchLeaderboard();
                }
              }}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
              disabled={isRefreshing}
            >
              <RotateCw size={16} className={`${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
          </div>
          
          {currentLeaderboard.loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
            </div>
          ) : currentLeaderboard.data.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Aucun classement disponible pour le moment
            </div>
          ) : (
            <div className="space-y-2">
              {currentLeaderboard.data.map((entry) => (
                <div key={entry.user_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4">
                      <span className={`w-12 text-lg font-semibold ${getRankColor(entry.rank)}`}>
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `${entry.rank}e`}
                      </span>
                      {entry.avatar_url ? (
                        <img
                          src={entry.avatar_url}
                          alt={`Avatar de ${entry.username}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getBgColor(entry.username)}`}>
                          {entry.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white" title={entry.username}>{truncateUsername(entry.username)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between sm:justify-end items-center gap-4 sm:gap-8 mt-2 sm:mt-0 w-full sm:w-auto">
                    <div className="w-8 flex justify-center">
                      {entry.trend === 'up' && (
                        <TrendingUp size={20} className="text-green-500" />
                      )}
                      {entry.trend === 'down' && (
                        <TrendingDown size={20} className="text-red-500" />
                      )}
                      {entry.trend === 'new' && (
                        <span className="text-yellow-500 text-sm font-medium">NEW</span>
                      )}
                    </div>
                    <div className="w-16 text-right">
                      <div className="font-medium text-gray-900 dark:text-white">{entry.total_score || 0}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">points</div>
                    </div>
                    <div className="w-16 text-right">
                      <div className="font-medium text-gray-900 dark:text-white">{(entry.precision_score || 0).toFixed(1)}%</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">précision</div>
                    </div>
                    <div className="w-16 text-right">
                      <div className="font-medium text-gray-900 dark:text-white">{entry.predictions_count || 0}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">pronostics</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hidden lg:flex lg:w-[calc(33.333333%-0.75rem)] flex-col space-y-4">
          <button
            onClick={() => setSelectedRanking('general')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-lg transition-colors ${
              selectedRanking === 'general'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-[#1B2028] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Trophy size={20} />
            <span className="font-medium">Classement Général</span>
          </button>

          <button
            onClick={() => setSelectedRanking('genre')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-lg transition-colors ${
              selectedRanking === 'genre'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-[#1B2028] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Film size={20} />
            <span className="font-medium">Classement par Genre</span>
          </button>

          <button
            onClick={() => setSelectedRanking('channel')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-lg transition-colors ${
              selectedRanking === 'channel'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-[#1B2028] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Tv size={20} />
            <span className="font-medium">Classement par Chaîne</span>
          </button>

          <button
            onClick={() => setSelectedRanking('semester')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-lg transition-colors ${
              selectedRanking === 'semester'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-[#1B2028] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <CalendarRange size={20} />
            <span className="font-medium">Classement du Semestre</span>
          </button>

          <button
            onClick={() => setSelectedRanking('monthly')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-lg transition-colors ${
              selectedRanking === 'monthly'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-[#1B2028] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Calendar size={20} />
            <span className="font-medium">Classement du Mois</span>
          </button>

          <button
            onClick={() => setSelectedRanking('weekly')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-lg transition-colors ${
              selectedRanking === 'weekly'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-[#1B2028] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Clock size={20} />
            <span className="font-medium">Classement de la Semaine</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RankingPage;