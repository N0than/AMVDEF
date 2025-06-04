import React, { useEffect, useState } from 'react';
import { RotateCw, RefreshCcw, Filter } from 'lucide-react';
import { Program } from '../../lib/database';
import { supabase } from '../../lib/supabase';
import ProgramCard from './ProgramCard';
import { Calendar, Clock } from 'lucide-react';

const ProgramList = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [showAllPrograms, setShowAllPrograms] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [userPredictions, setUserPredictions] = useState<Set<string>>(new Set());

  const isToday = (date: string) => {
    const programDate = new Date(date);
    const today = new Date();
    return programDate.toDateString() === today.toDateString();
  };

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);
      setError(null);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .gte('air_date', today.toISOString())
        .order('air_date', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch programs: ${error.message}`);
      }
      
      setPrograms(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch programs';
      console.error('Error fetching programs:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const fetchUserPredictions = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: predictions, error: predictionsError } = await supabase
        .from('predictions')
        .select('program_id')
        .eq('user_id', user.id);

      if (predictionsError) {
        throw new Error(`Failed to fetch predictions: ${predictionsError.message}`);
      }

      if (predictions) {
        setUserPredictions(new Set(predictions.map(p => p.program_id)));
      }
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching user predictions:', error);
    }
  };

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw new Error(`Authentication error: ${userError.message}`);
        }
        
        if (user) {
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();

          if (profileError) {
            throw new Error(`Failed to fetch profile: ${profileError.message}`);
          }

          if (data) {
            setUsername(data.username);
          }
        }
      } catch (error) {
        console.error('Error fetching username:', error);
      }
    };

    fetchUsername();
    fetchPrograms();
    fetchUserPredictions();

    // Subscribe to predictions changes
    const predictionsChannel = supabase
      .channel('predictions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'predictions'
      }, () => {
        fetchUserPredictions();
      })
      .subscribe();

    // Subscribe to changes with error handling
    const channel = supabase
      .channel('programs_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'programs'
      }, () => {
        fetchPrograms();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to program changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error in program changes subscription');
        }
      });

    return () => {
      predictionsChannel.unsubscribe();
      channel.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchPrograms}
          className="mt-4 flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors mx-auto"
        >
          <RotateCw size={16} />
          <span>Réessayer</span>
        </button>
      </div>
    );
  }

  // Filter programs based on user predictions
  const filteredPrograms = showAllPrograms
    ? programs
    : programs.filter(program => {
        // Exclure les programmes pour lesquels l'utilisateur a déjà fait un pronostic
        return !userPredictions.has(program.id);
      });

  // Sort programs to show today's programs first
  const sortedPrograms = [...filteredPrograms].sort((a, b) => {
    const aIsToday = isToday(a.air_date);
    const bIsToday = isToday(b.air_date);
    if (aIsToday && !bIsToday) return -1;
    if (!aIsToday && bIsToday) return 1;
    return new Date(a.air_date).getTime() - new Date(b.air_date).getTime();
  });
  
  // Check if there are no programs at all
  if (programs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Aucun programme à venir disponible pour le moment
      </div>
    );
  }

  // Show "up to date" message if all today's programs have been predicted
  const showUpToDateMessage = !showAllPrograms && programs.length > 0 && filteredPrograms.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:items-center">
        <div className="w-full sm:w-auto">
          <button
            onClick={() => {
              fetchPrograms();
              setLastUpdate(new Date());
            }}
            className="button relative flex items-center overflow-hidden rounded-full bg-gray-800/90 backdrop-blur-md w-full"
            style={{ '--clr': '#6f5e90' } as React.CSSProperties}
          >
            <div className="button-decor"></div>
            <div className="button-content">
              <span className="button__icon">
                <RefreshCcw size={18} className={`text-white transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
              </span>
              <span className="button__text">
                {lastUpdate.toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </button>
        </div>
        <div className="w-full sm:w-auto">
          <button
            onClick={() => setShowAllPrograms(!showAllPrograms)}
            className="button relative flex items-center overflow-hidden rounded-full bg-gray-800/90 backdrop-blur-md w-full"
            style={{ '--clr': '#6f5e90' } as React.CSSProperties}
          >
            <div className="button-decor"></div>
            <div className="button-content">
              <span className="button__icon">
                <Filter size={18} className="text-white" />
              </span>
              <span className="button__text">
                {showAllPrograms ? 'Pronostics en attente' : 'Tous les pronostics'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {showUpToDateMessage ? (
        <div className="text-center py-12">
          <img
            src="https://i.postimg.cc/nrWKYG3c/Chat-GPT-Image-10-avr-2025-01-52-01.png"
            alt="TV Icon"
            className="w-80 h-80 mx-auto mb-6"
          />
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Vous avez fait tous vos pronostics du jour !</span>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedPrograms.map((program) => (
          <ProgramCard 
            key={program.id} 
            program={program}
            onPredictionSubmit={fetchPrograms}
            isToday={isToday(program.air_date)}
          />
        ))}
      </div>
      )}
    </div>
  );
};

export default ProgramList;