import React, { useEffect, useState } from 'react';
import { Target, Clock, TrendingUp, RotateCw, ChevronDown, ChevronUp, Trophy, Tv } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

interface PredictionData {
  prediction_id: string;
  user_id: string;
  program_id: string;
  predicted_audience: number;
  real_audience: number | null;
  calculated_accuracy: number | null;
  predicted_score_team1: number | null;
  predicted_score_team2: number | null;
  calculated_score: number | null;
  program: {
    name: string;
    channel: string;
    genre: string;
    image_url: string | null;
    allow_score_prediction: boolean;
    real_score_team1: number | null;
    real_score_team2: number | null;
    team1_name: string | null;
    team2_name: string | null;
  };
}

interface ProgramRanking {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_score: number;
  precision_score: number;
  rank: number;
  predictions_count: number;
}

const StatCard = ({ icon, title, value }: StatCardProps) => (
  <div className="bg-white dark:bg-[#1B2028] rounded-lg p-6 shadow-sm">
    <div className="text-purple-500 mb-4">{icon}</div>
    <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">{title}</div>
    <div className="text-gray-900 dark:text-white text-3xl font-bold">{value}</div>
  </div>
);

const PredictionRow = ({ prediction }: { prediction: PredictionData }) => {
  const [showRanking, setShowRanking] = useState(false);
  const [rankings, setRankings] = useState<ProgramRanking[]>([]);
  const [loading, setLoading] = useState(false);

  const getScoreBadge = (prediction: PredictionData) => {
    if (prediction.program.genre !== 'Football') {
      return null;
    }
    
    if (prediction.program.real_score_team1 === null || 
        prediction.program.real_score_team2 === null ||
        prediction.predicted_score_team1 === null || 
        prediction.predicted_score_team2 === null) {
      return null;
    }

    const isExactScore = 
      prediction.predicted_score_team1 === prediction.program.real_score_team1 &&
      prediction.predicted_score_team2 === prediction.program.real_score_team2;

    const isCorrectResult = 
      (prediction.program.real_score_team1 > prediction.program.real_score_team2 && prediction.predicted_score_team1 > prediction.predicted_score_team2) ||
      (prediction.program.real_score_team1 < prediction.program.real_score_team2 && prediction.predicted_score_team1 < prediction.predicted_score_team2) ||
      (prediction.program.real_score_team1 === prediction.program.real_score_team2 && prediction.predicted_score_team1 === prediction.predicted_score_team2);

    if (isExactScore) {
      return (
        <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
          Bonus Foot x2
        </span>
      );
    }

    if (isCorrectResult) {
      return (
        <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
          Bonus Foot +50%
        </span>
      );
    }

    return null;
  };

  const getBonusBadge = (prediction: PredictionData) => {
    if (!prediction.program.is_event_program || !prediction.bonus_answer) {
      return null;
    }

    if (prediction.predicted_bonus_answer === prediction.bonus_answer) {
      return (
        <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
          Bonus Programme x2
        </span>
      );
    }

    return null;
  };

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('classement_par_programme')
        .select('*')
        .eq('program_id', prediction.program_id)
        .order('rank', { ascending: true });

      if (error) throw error;
      setRankings(data || []);
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRanking = async () => {
    if (!showRanking && rankings.length === 0) {
      await fetchRankings();
    }
    setShowRanking(!showRanking);
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-gray-400';
      case 3: return 'text-amber-600';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
          {prediction.program.image_url ? (
            <img
              src={prediction.program.image_url}
              alt={prediction.program.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Tv size={24} className="text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-grow w-full sm:w-auto">
          <h3 className="font-medium text-gray-900 dark:text-white">
            {prediction.program.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {prediction.program.channel}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {prediction.real_audience !== null && (
              <>
                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                  Audience réelle: {prediction.real_audience.toFixed(1)}M{' '}
                </span>
                {prediction.calculated_accuracy !== null && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                      {prediction.calculated_accuracy.toFixed(1)}% précision
                    </span>
                    {prediction.program.genre === 'Football' && (
                      <span className="ml-2">
                        {getScoreBadge(prediction)}
                      </span>
                    )}
                    {getBonusBadge(prediction)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex justify-between sm:flex-col sm:items-end mt-2 sm:mt-0 w-full sm:w-auto">
          <div className="font-medium text-gray-900 dark:text-white">
            {prediction.predicted_audience.toFixed(1)}M
          </div>
          {prediction.calculated_score !== null && (
            <div className="flex flex-col items-end gap-2">
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {prediction.total_score > 0 
                  ? `+${prediction.total_score} points` 
                  : '0 point'}
              </span>
              <button
                onClick={toggleRanking}
                className="flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
              >
                <Trophy size={16} />
                {showRanking ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {showRanking && (
        <div className="pl-4 sm:pl-24 pr-4 py-4 bg-gray-50 dark:bg-[#252A34] rounded-lg mt-2">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                Classement pour ce programme
              </h4>
              {rankings.map((rank) => (
                <div key={rank.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className={`w-6 text-lg font-semibold ${getRankColor(rank.rank)}`}>
                        #{rank.rank}
                      </span>
                      {rank.avatar_url ? (
                        <img
                          src={rank.avatar_url}
                          alt={rank.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-medium">
                          {rank.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {rank.username}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end ml-14 sm:ml-0">
                    <span className="font-medium text-gray-900 dark:text-white min-w-[70px] text-right">
                      {rank.total_score} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PredictionsPage = () => {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    averagePrecision: number,
    totalPredictions: number,
    totalPoints: number
  }>({
    averagePrecision: 0,
    totalPredictions: 0,
    totalPoints: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('predictions_with_accuracy3')
        .select(`
          total_score,
          prediction_id,
          user_id,
          program_id,
          predicted_score_team1,
          predicted_score_team2,
          predicted_audience,
          real_audience,
          calculated_accuracy,
          calculated_score,
          predicted_bonus_answer,
          bonus_answer,
          calculated_bonus_score,
          program:programs(
            name,
            channel,
            genre,
            image_url,
            allow_score_prediction,
            real_score_team1,
            real_score_team2,
            team1_name,
            team2_name,
            is_event_program,
            bonus_title,
            bonus_choices
          )
        `)
        .eq('user_id', user.id)
        .order('prediction_id', { ascending: false });

      if (error) throw error;

      setPredictions(data || []);
      
      // Calculate stats from predictions
      const validPredictions = data?.filter(p => p.real_audience !== null) || [];
      const totalPoints = validPredictions.reduce((sum, p) => sum + (p.total_score || 0), 0);
      const avgPrecision = validPredictions.length > 0
        ? validPredictions.reduce((sum, p) => sum + (p.calculated_accuracy || 0), 0) / validPredictions.length
        : 0;
      
      setStats({
        averagePrecision: Number(avgPrecision.toFixed(1)),
        totalPredictions: data?.length || 0,
        totalPoints: totalPoints
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPredictions();

    // Subscribe to changes
    const subscription = supabase
      .channel('predictions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'predictions'
      }, () => {
        fetchPredictions();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6 lg:mb-8">Mes Pronostics</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <StatCard
          icon={<Target size={24} />}
          title="Précision moyenne"
          value={`${stats.averagePrecision.toFixed(1)}%`}
        />
        <StatCard
          icon={<Clock size={24} />}
          title="Total pronostics"
          value={stats.totalPredictions.toString()}
        />
        <StatCard
          icon={<TrendingUp size={24} />}
          title="Points gagnés"
          value={stats.totalPoints.toString()}
        />
      </div>

      {/* Predictions History */}
      <div className="bg-white dark:bg-[#1B2028] rounded-lg p-4 lg:p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Historique des pronostics
          </h2>
          <button 
            onClick={fetchPredictions}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            disabled={isRefreshing}
          >
            <RotateCw size={16} className={`${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            Aucun pronostic pour le moment
          </div>
        ) : (
          <div className="space-y-2">
            {predictions.map((prediction) => (
              <PredictionRow key={prediction.prediction_id} prediction={prediction} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionsPage