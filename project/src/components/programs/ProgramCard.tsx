import React, { useState, useEffect } from 'react';
import { Tv, Calendar, Film, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Program {
  id: string;
  name: string;
  channel: string;
  air_date: string;
  genre: string | null;
  image_url: string | null;
  description: string | null;
  allow_score_prediction?: boolean;
  team1_name?: string;
  team2_name?: string;
  real_score_team1?: number;
  real_score_team2?: number;
  broadcast_period?: string;
  is_event_program?: boolean;
  bonus_title?: string;
  bonus_choices?: string[];
}

interface ProgramCardProps {
  program: Program;
  onPredictionSubmit?: () => void;
}

const ProgramCard: React.FC<ProgramCardProps> = ({ program, onPredictionSubmit }) => { 
  const [prediction, setPrediction] = useState<string>('0');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasPredicted, setHasPredicted] = useState(false);
  const [userPrediction, setUserPrediction] = useState<number | null>(null);
  const [scoreTeam1, setScoreTeam1] = useState(0);
  const [scoreTeam2, setScoreTeam2] = useState(0);
  const [bonusAnswer, setBonusAnswer] = useState(''); 
  const [isPredictionsClosed, setPredictionsClosed] = useState(false);

  useEffect(() => {
    const checkPredictionStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if predictions are closed (after 22:00 on air date)
      const now = new Date();
      const airDate = new Date(program.air_date);
      const isSameDay = now.toDateString() === airDate.toDateString();
      const isAfter22h = now.getHours() >= 22;
      
      if (isSameDay && isAfter22h) {
        setPredictionsClosed(true);
        return;
      }

      const { data: existingPrediction } = await supabase
        .from('predictions')
        .select('id, predicted_audience, predicted_score_team1, predicted_score_team2, predicted_bonus_answer')
        .match({ user_id: user.id, program_id: program.id });

      if (existingPrediction && existingPrediction.length > 0) {
        setHasPredicted(true);
        setUserPrediction(existingPrediction[0].predicted_audience);
        setScoreTeam1(existingPrediction[0].predicted_score_team1 || 0);
        setScoreTeam2(existingPrediction[0].predicted_score_team2 || 0);
        setBonusAnswer(existingPrediction[0].predicted_bonus_answer || '');
      }
    };

    checkPredictionStatus();
  }, [program.id, program.air_date]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePredictionChange = (value: string) => {
    // Update both the slider and input value
    setPrediction(value);
    setInputValue(parseFloat(value).toFixed(1));
  };

  const handleInputChange = (value: string) => {
    // Replace comma with dot
    const sanitizedValue = value.replace(',', '.');
    
    // Parse the value and ensure it's within bounds
    let numericValue = parseFloat(sanitizedValue);
    
    if (!isNaN(numericValue)) {
      numericValue = Math.max(0, Math.min(10, numericValue));
      setPrediction(numericValue.toString());
      setInputValue(sanitizedValue);
    } else {
      setInputValue(value);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);
      
      const numericPrediction = parseFloat(prediction);
      
      // Check if predictions are closed
      const now = new Date();
      const airDate = new Date(program.air_date);
      const isSameDay = now.toDateString() === airDate.toDateString();
      const isAfter22h = now.getHours() >= 22;
      
      if (isSameDay && isAfter22h) {
        throw new Error('Les pronostics sont fermés pour ce programme');
      }

      if (isNaN(numericPrediction) || numericPrediction <= 0 || numericPrediction > 10) {
        throw new Error('Le pronostic doit être compris entre 0 et 10 millions');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: existingPrediction, error: checkError } = await supabase
        .from('predictions')
        .select('id')
        .match({ user_id: user.id, program_id: program.id });

      if (checkError) throw checkError;
      if (existingPrediction && existingPrediction.length > 0) {
        throw new Error('Vous avez déjà fait un pronostic pour ce programme');
      }

      const { error: insertError } = await supabase
        .from('predictions')
        .insert([{
          user_id: user.id,
          program_id: program.id,
          predicted_audience: numericPrediction,
          predicted_score_team1: program.allow_score_prediction ? scoreTeam1 : null,
          predicted_score_team2: program.allow_score_prediction ? scoreTeam2 : null,
          predicted_bonus_answer: program.is_event_program ? bonusAnswer : null,
          submitted_at: new Date().toISOString()
        }]);

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      if (onPredictionSubmit) onPredictionSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1B2028] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <div className="relative h-48">
        {program.image_url ? (
          <img
            src={program.image_url}
            alt={program.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <Tv size={48} className="text-gray-400 dark:text-gray-500" />
          </div>
        )}
        <div className="absolute top-2 right-2 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">
          {program.channel}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {program.name}
        </h3>

        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
          <Calendar size={16} className="mr-1" />
          <span>
            {formatDate(program.air_date)} - {program.broadcast_period || 'Heure non précisée'}
          </span>
        </div>

        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
          <Film size={16} className="mr-1" />
          <span>{program.genre}</span>
        </div>

        {program.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
            {program.description}
          </p>
        )}

        {program.allow_score_prediction && (
          <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={16} className="text-purple-500" />
              <h4 className="font-medium text-gray-900 dark:text-white">
                Pronostic du match
              </h4>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {program.team1_name || 'Équipe 1'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={scoreTeam1}
                  onChange={(e) => setScoreTeam1(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={hasPredicted}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
              <div className="text-xl font-bold text-gray-400">-</div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {program.team2_name || 'Équipe 2'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={scoreTeam2}
                  onChange={(e) => setScoreTeam2(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={hasPredicted}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {program.is_event_program && (
          <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={16} className="text-purple-500" />
              <h4 className="font-medium text-gray-900 dark:text-white">
                {program.bonus_title?.includes('Bonus PDA') 
                  ? 'Bonus PDA' 
                  : program.bonus_title || 'Bonus'}
              </h4>
            </div>
            
            {program.bonus_title?.includes('Cible:') && (
              <div className="mb-3 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded text-sm text-purple-800 dark:text-purple-300">
                <span className="font-medium">Cible:</span> {program.bonus_title.split('Cible:')[1].trim()}
              </div>
            )}
            
            <select
              value={bonusAnswer}
              onChange={(e) => setBonusAnswer(e.target.value)}
              disabled={hasPredicted}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <option value="">Sélectionner une réponse</option>
              {program.bonus_choices?.map((choice, index) => (
                <option key={index} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-auto space-y-4 pt-4">
          {hasPredicted && userPrediction !== null ? (
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Votre pronostic</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {userPrediction.toFixed(1)}M
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Votre pronostic (en millions)
              </label>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={prediction}
                    onChange={(e) => handlePredictionChange(e.target.value)}
                    disabled={hasPredicted || isPredictionsClosed}
                    className="w-4/5 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="w-16">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => handleInputChange(e.target.value)}
                      disabled={hasPredicted || isPredictionsClosed}
                      className="w-full px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-center"
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Pronostic enregistré avec succès !</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || hasPredicted || isPredictionsClosed}
            className={`w-full px-4 py-2 rounded-lg transition-colors ${
              hasPredicted || isPredictionsClosed
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {hasPredicted
              ? 'Pronostic déjà soumis'
              : isPredictionsClosed
              ? 'Les pronostics sont fermés pour ce programme'
              : submitting
              ? 'Envoi...'
              : 'Valider mon pronostic'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgramCard;