import React, { useState, useEffect, useCallback } from 'react';
import { BarChart2, Bell, RotateCw, PenLine, Trash2, Plus, Copy, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useForm } from '../../hooks/useForm';
import ConfirmationDialog from '../common/ConfirmationDialog';

interface Program {
  id: number;
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
  real_audience?: number;
  is_event_program?: boolean;
  bonus_title?: string;
  bonus_choices?: string[];
  bonus_answer?: string;
}

const StatCard = ({ icon, title, value, className = "" }: { icon: React.ReactNode; title: string; value: string | number; className?: string }) => (
  <div className={`bg-white dark:bg-[#1B2028] rounded-lg p-6 shadow-sm ${className}`}>
    <div className="flex items-center gap-3 mb-4">
      <div className="text-purple-500">{icon}</div>
      <h3 className="text-gray-900 dark:text-white font-medium">{title}</h3>
    </div>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
  </div>
);

const AdminPage = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);
  const [filters, setFilters] = useState({
    channel: '',
    genre: '',
    period: '',
    status: 'all' // 'all', 'current' or 'past'
  });
  
  const initialFormState = {
    title: '',
    channel: '',
    date: '',
    period: 'Prime-time', 
    genre: '',
    imageUrl: '',
    team1_name: '',
    team2_name: '',
    real_score_team1: '',
    real_score_team2: '',
    real_audience: '',
    description: '',
    is_event_program: false,
    is_pda_challenge: false,
    pda_target: '',
    bonus_title: '',
    bonus_choices: [] as string[],
    bonus_answer: ''
  };

  const { formData, error, loading, handleChange, handleSubmit, resetForm } = useForm({
    initialState: initialFormState,
    onSubmit: async (data) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // If it's a PDA challenge, update the bonus title to include the target
      let bonusTitle = data.bonus_title;
      if (data.is_pda_challenge && data.pda_target) {
        // Map of target codes to human-readable labels
        const targetLabels: Record<string, string> = {
          'FRDA_15': 'FRDA avec enfant < 15 ans',
          'FRDA_25': 'FRDA avec enfant < 25 ans',
          'FRDA_25_59': 'FRDA 25-59 ans',
          'FRDA_15_49': 'FRDA 15-49 ans',
          'F_25_49': 'Femmes 25-49 ans',
          'F_25_59': 'Femmes 25-59 ans',
          'F_35_49': 'Femmes 35-49 ans',
          'F_35_59': 'Femmes 35-59 ans',
          'E_25_49': 'Ensemble 25-49 ans',
          'E_25_59': 'Ensemble 25-59 ans',
          'E_35_49': 'Ensemble 35-49 ans',
          'E_35_59': 'Ensemble 35-59 ans',
          'ICSP_25_49': 'ICSP+ 25-49 ans',
          'RDA_60': 'RDA -60 ans',
          'H_25_49': 'Hommes 25-49 ans',
          'H_25_59': 'Hommes 25-59 ans'
        };
        
        bonusTitle = `Bonus PDA Cible: ${targetLabels[data.pda_target] || data.pda_target}`; 
      }

      const programData = {
        name: data.title,
        channel: data.channel,
        air_date: data.date ? new Date(data.date + 'T00:00:00').toISOString() : null,
        broadcast_period: data.period,
        genre: data.genre || null,
        image_url: data.imageUrl || null,
        description: data.description || null,
        team1_name: data.team1_name || null,
        team2_name: data.team2_name || null,
        real_score_team1: data.real_score_team1 ? parseInt(data.real_score_team1) : null,
        real_score_team2: data.real_score_team2 ? parseInt(data.real_score_team2) : null,
        real_audience: data.real_audience ? parseFloat(data.real_audience) : null,
        is_event_program: data.is_event_program,
        bonus_title: bonusTitle || null,
        bonus_choices: data.bonus_choices,
        bonus_answer: data.bonus_answer || null
      };

      if (editingProgramId) {
        const { error } = await supabase
          .from('programs')
          .update(programData)
          .eq('id', editingProgramId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('programs')
          .insert([{
            ...programData,
            created_by: user.id
          }]);
        
        if (error) throw error;
      }

      await fetchPrograms();
      setShowAddForm(false);
      setEditingProgramId(null);
    }
  });

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select(`
          id,
          name,
          channel,
          air_date,
          genre,
          image_url,
          description,
          broadcast_period,
          real_audience,
          allow_score_prediction,
          team1_name,
          team2_name,
          real_score_team1,
          real_score_team2,
          is_event_program,
          bonus_title,
          bonus_choices,
          bonus_answer,
          created_by,
          created_at,
          updated_at
        `)
        .order('air_date', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  useEffect(() => {
    fetchPrograms();

    // Set up real-time subscription
    const channel = supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'programs'
        },
        () => {
          fetchPrograms();
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const handleShowForm = () => {
    resetForm();
    setShowAddForm(!showAddForm);
    if (!showAddForm) {
      setTimeout(() => {
        const formElement = document.getElementById('program-form');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
    setEditingProgramId(null);
  };

  const handleEdit = (program: Program) => {
    handleChange('title', program.name);
    handleChange('channel', program.channel);
    handleChange('date', program.air_date ? new Date(program.air_date).toLocaleDateString('fr-CA') : ''); 
    handleChange('period', program.broadcast_period || 'Prime-time');
    handleChange('genre', program.genre || '');
    handleChange('imageUrl', program.image_url || '');
    handleChange('team1_name', program.team1_name || '');
    handleChange('team2_name', program.team2_name || '');
    handleChange('real_score_team1', program.real_score_team1?.toString() || '');
    handleChange('real_score_team2', program.real_score_team2?.toString() || '');
    handleChange('real_audience', program.real_audience ? program.real_audience.toString() : '');
    handleChange('description', program.description || '');
    handleChange('is_event_program', program.is_event_program || false);
    
    // Check if this is a PDA challenge by looking at the bonus title
    const isPdaChallenge = program.bonus_title === 'Bonus PDA';
    handleChange('is_pda_challenge', isPdaChallenge);
    
    // If it's a PDA challenge, extract the target from the bonus title
    if (isPdaChallenge && program.bonus_title) {
      const pdaTargetMatch = program.bonus_title.match(/Bonus PDA Cible: (.+)/);
      if (pdaTargetMatch && pdaTargetMatch[1]) {
        // Map of human-readable labels to target codes
        const targetLabels: Record<string, string> = {
          'FRDA avec enfant < 15 ans': 'FRDA_15',
          'FRDA avec enfant < 25 ans': 'FRDA_25',
          'FRDA 25-59 ans': 'FRDA_25_59',
          'FRDA 15-49 ans': 'FRDA_15_49',
          'Femmes 25-49 ans': 'F_25_49',
          'Femmes 25-59 ans': 'F_25_59',
          'Femmes 35-49 ans': 'F_35_49',
          'Femmes 35-59 ans': 'F_35_59',
          'Ensemble 25-49 ans': 'E_25_49',
          'Ensemble 25-59 ans': 'E_25_59',
          'Ensemble 35-49 ans': 'E_35_49',
          'Ensemble 35-59 ans': 'E_35_59',
          'ICSP+ 25-49 ans': 'ICSP_25_49',
          'RDA -60 ans': 'RDA_60',
          'Hommes 25-49 ans': 'H_25_49',
          'Hommes 25-59 ans': 'H_25_59'
        };
        
        // Find the target value from the label in the title
        const targetValue = Object.entries(targetLabels).find(([label]) => 
          label === pdaTargetMatch[1]
        )?.[1];
        
        if (targetValue) {
          handleChange('pda_target', targetValue);
        }
      }
    }

    // If it's a PDA challenge, ensure all percentages are selected
    if (isPdaChallenge) {
      const allPercentages = Array.from({ length: 101 }, (_, i) => `${i}%`);
      handleChange('bonus_choices', allPercentages);
    }
    
    handleChange('bonus_title', program.bonus_title || '');
    handleChange('bonus_choices', program.bonus_choices || []);
    handleChange('bonus_answer', program.bonus_answer || '');
    setEditingProgramId(program.id);
    setShowAddForm(true);
    setTimeout(() => {
      const formElement = document.getElementById('program-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleDeleteClick = (program: Program) => {
    setProgramToDelete(program);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!programToDelete) return;

    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', programToDelete.id);
      
      if (error) throw error;
      
      await fetchPrograms();
      setShowDeleteConfirm(false);
      setProgramToDelete(null);
    } catch (error) {
      console.error('Error deleting program:', error);
    }
  };

  const handleDuplicate = async (program: Program) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const programData = {
      name: `${program.name} (copie)`,
      channel: program.channel,
      air_date: program.air_date,
      broadcast_period: program.broadcast_period,
      genre: program.genre,
      image_url: program.image_url,
      description: program.description,
      team1_name: program.team1_name,
      team2_name: program.team2_name,
      is_event_program: program.is_event_program,
      bonus_title: program.bonus_title,
      bonus_choices: program.bonus_choices,
      created_by: user.id
    };

    try {
      const { error } = await supabase
        .from('programs')
        .insert([programData]);
      
      if (error) throw error;
      await fetchPrograms();
    } catch (error) {
      console.error('Error duplicating program:', error);
    }
  };

  const filteredPrograms = programs.filter(program => {
    if (filters.status !== 'all') {
      const isPastProgram = new Date(program.air_date) < new Date();
      if (filters.status === 'past' && !isPastProgram) return false;
      if (filters.status === 'current' && isPastProgram) return false;
    }
    
    return (
      (!filters.channel || program.channel === filters.channel) &&
      (!filters.genre || program.genre === filters.genre) &&
      (!filters.period || program.broadcast_period === filters.period)
    );
  });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Administration
      </h1>

      <div className="grid grid-cols-2 gap-6">
        <StatCard 
          icon={<BarChart2 size={24} />}
          title="Total Programmes"
          value={programs.length}
          className="col-span-2 lg:col-span-1"
        />
        <div className="bg-white dark:bg-[#1B2028] rounded-lg p-6 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="text-purple-500">
                <Bell size={24} />
              </div>
              <h3 className="text-gray-900 dark:text-white font-medium">Programme</h3>
            </div>
          </div>
          <button 
            onClick={handleShowForm}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 justify-center"
          >
            <Plus size={20} />
            {showAddForm ? 'Masquer le formulaire' : 'Ajouter un programme'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1B2028] rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {filters.status === 'past' ? 'Programmes passés' : filters.status === 'all' ? 'Liste des programmes' : 'Programmes à venir'}
          </h2>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full lg:w-auto px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">Tous les programmes</option>
              <option value="current">Programmes à venir</option>
              <option value="past">Programmes passés</option>
            </select>
            <select
              value={filters.channel}
              onChange={(e) => setFilters(prev => ({ ...prev, channel: e.target.value }))}
              className="w-full lg:w-auto px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Toutes les chaînes</option>
              <option value="TF1">TF1</option>
              <option value="France 2">France 2</option>
              <option value="France 3">France 3</option>
              <option value="Canal+">Canal+</option>
              <option value="France 5">France 5</option>
              <option value="M6">M6</option>
              <option value="Arte">Arte</option>
              <option value="C8">C8</option>
              <option value="W9">W9</option>
              <option value="TMC">TMC</option>
              <option value="TFX">TFX</option>
              <option value="CSTAR">CSTAR</option>
              <option value="Gulli">Gulli</option>
              <option value="TF1 Séries Films">TF1 Séries Films</option>
              <option value="6ter">6ter</option>
              <option value="RMC Story">RMC Story</option>
              <option value="RMC Découverte">RMC Découverte</option>
              <option value="Chérie 25">Chérie 25</option>
              <option value="L'Équipe">L'Équipe</option>
            </select>
            <select
              value={filters.genre}
              onChange={(e) => setFilters(prev => ({ ...prev, genre: e.target.value }))}
              className="w-full lg:w-auto px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Tous les genres</option>
              <option value="Divertissement">Divertissement</option>
              <option value="Série">Série</option>
              <option value="Film">Film</option>
              <option value="Information">Information</option>
              <option value="Sport">Sport</option>
              <option value="Football">Football</option>
              <option value="Documentaire">Documentaire</option>
              <option value="Magazine">Magazine</option>
              <option value="Jeunesse">Jeunesse</option>
            </select>
            <select
              value={filters.period}
              onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
              className="w-full lg:w-auto px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Toutes les périodes</option>
              <option value="Day">Journée</option>
              <option value="Access">Access</option>
              <option value="Prime-time">Prime-time</option>
              <option value="Night">Nuit</option>
              <option value="PS2">PS2</option>
              <option value="PS3">PS3</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                <th className="pb-3 text-gray-500 dark:text-gray-400 text-sm">Titre</th>
                <th className="pb-3 text-gray-500 dark:text-gray-400 hidden md:table-cell text-sm">Chaîne</th>
                <th className="pb-3 text-gray-500 dark:text-gray-400 hidden md:table-cell text-sm">Date</th>
                <th className="pb-3 text-gray-500 dark:text-gray-400 hidden md:table-cell text-sm">Période</th>
                <th className="pb-3 text-gray-500 dark:text-gray-400 hidden md:table-cell text-sm">Genre</th>
                <th className="pb-3 text-gray-500 dark:text-gray-400 hidden lg:table-cell text-sm">Score</th>
                <th className="pb-3 text-gray-500 dark:text-gray-400 hidden lg:table-cell text-sm">Audience</th>
                <th className="pb-3 text-gray-500 dark:text-gray-400 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrograms.map((program) => (
                <tr key={program.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-4 text-gray-900 dark:text-white text-sm">{program.name}</td>
                  <td className="py-4 text-gray-900 dark:text-white hidden md:table-cell text-sm">{program.channel}</td>
                  <td className="py-4 text-gray-900 dark:text-white hidden md:table-cell text-sm">
                    {new Date(program.air_date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-4 text-gray-900 dark:text-white hidden md:table-cell text-sm">{program.broadcast_period}</td>
                  <td className="py-4 text-gray-900 dark:text-white hidden md:table-cell text-sm">{program.genre}</td>
                  <td className="py-4 text-gray-900 dark:text-white hidden lg:table-cell text-sm">
                    {program.allow_score_prediction && (
                      program.real_score_team1 !== null && program.real_score_team2 !== null
                        ? `${program.real_score_team1} - ${program.real_score_team2}`
                        : '-'
                    )}
                  </td>
                  <td className="py-4 text-gray-900 dark:text-white hidden lg:table-cell text-sm">
                    {program.real_audience !== null ? 
                      `${program.real_audience.toFixed(2)}M` : 
                      '-'
                    }
                  </td>
                  <td className="py-4 text-sm">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDuplicate(program as Program)}
                        className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Dupliquer"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(program as Program)}
                        className="p-2 text-purple-500 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <PenLine size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(program as Program)}
                        className="p-2 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {showAddForm && (
          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h3 id="program-form" className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {editingProgramId ? 'Modifier le programme' : 'Ajouter un nouveau programme'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Titre
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Titre du programme"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Chaîne
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    required
                    value={formData.channel}
                    onChange={(e) => handleChange('channel', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Sélectionner une chaîne</option>
                    <option value="TF1">TF1</option>
                    <option value="France 2">France 2</option>
                    <option value="France 3">France 3</option>
                    <option value="Canal+">Canal+</option>
                    <option value="France 5">France 5</option>
                    <option value="M6">M6</option>
                    <option value="Arte">Arte</option>
                    <option value="C8">C8</option>
                    <option value="W9">W9</option>
                    <option value="TMC">TMC</option>
                    <option value="TFX">TFX</option>
                    <option value="CSTAR">CSTAR</option>
                    <option value="Gulli">Gulli</option>
                    <option value="TF1 Séries Films">TF1 Séries Films</option>
                    <option value="6ter">6ter</option>
                    <option value="RMC Story">RMC Story</option>
                    <option value="RMC Découverte">RMC Découverte</option>
                    <option value="Chérie 25">Chérie 25</option>
                    <option value="L'Équipe">L'Équipe</option>
                    <option value="T18">T18</option>
                    <option value="NOVO19">NOVO19</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Genre
                  </label>
                  <select
                    value={formData.genre}
                    onChange={(e) => handleChange('genre', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Sélectionner un genre</option>
                    <option value="Divertissement">Divertissement</option>
                    <option value="Série">Série</option>
                    <option value="Film">Film</option>
                    <option value="Information">Information</option>
                    <option value="Sport">Sport</option>
                    <option value="Football">Football</option>
                    <option value="Documentaire">Documentaire</option>
                    <option value="Magazine">Magazine</option>
                    <option value="Jeunesse">Jeunesse</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date de diffusion
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Période de diffusion
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    required
                    value={formData.period}
                    onChange={(e) => handleChange('period', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Day">Journée</option>
                    <option value="Access">Access</option>
                    <option value="Prime-time">Prime-time</option>
                    <option value="Night">Nuit</option>
                    <option value="PS2">PS2</option>
                    <option value="PS3">PS3</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL de l'image
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => handleChange('imageUrl', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://..."
                />
              </div>

              {formData.genre === 'Football' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Équipe 1
                      </label>
                      <input
                        type="text"
                        value={formData.team1_name}
                        onChange={(e) => handleChange('team1_name', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Nom de l'équipe 1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Équipe 2
                      </label>
                      <input
                        type="text"
                        value={formData.team2_name}
                        onChange={(e) => handleChange('team2_name', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Nom de l'équipe 2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Score Équipe 1
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.real_score_team1}
                        onChange={(e) => handleChange('real_score_team1', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Score équipe 1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Score Équipe 2
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.real_score_team2}
                        onChange={(e) => handleChange('real_score_team2', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Score équipe 2"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Audience Réelle (en millions)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.real_audience}
                  onChange={(e) => handleChange('real_audience', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]"
                  placeholder="Description du programme..."
                />
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_event_program"
                    checked={formData.is_event_program}
                    onChange={(e) => handleChange('is_event_program', e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="is_event_program" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Activer un pronostic bonus
                  </label>
                </div>
              </div>

              {formData.is_event_program && (
                <div className="space-y-4 mt-4">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        id="is_pda_challenge"
                        checked={formData.is_pda_challenge}
                        onChange={(e) => {
                          handleChange('is_pda_challenge', e.target.checked);
                          if (e.target.checked) {
                            handleChange('bonus_title', 'Bonus PDA'); 
                            handleChange('bonus_choices', [
                              'Moins de 5 %',
                              '5 à 10 %',
                              '10 à 15 %',
                              '15 à 20 %',
                              '20 à 25 %',
                              '25 à 30 %',
                              '30 à 35 %',
                              '35 à 40 %',
                              '40 à 45 %',
                              '45 à 50 %',
                              'Plus de 50 %'
                            ]);
                          }
                        }}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <label htmlFor="is_pda_challenge" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
                        Défi PDA
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Intitulé du bonus
                    </label>
                    <input
                      type="text"
                      value={formData.bonus_title}
                      onChange={(e) => handleChange('bonus_title', e.target.value)}
                      disabled={formData.is_pda_challenge}
                      className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Ex: Qui sera éliminé cette semaine ?"
                    />
                  </div>

                  {formData.is_pda_challenge && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Cible PDA
                        </label>
                        <select
                          value={formData.pda_target}
                          onChange={(e) => handleChange('pda_target', e.target.value)}
                          className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Sélectionner une cible</option>
                          <option value="FRDA_15">FRDA avec enfant &lt; 15 ans</option>
                          <option value="FRDA_25">FRDA avec enfant &lt; 25 ans</option>
                          <option value="FRDA_25_59">FRDA 25-59 ans</option>
                          <option value="FRDA_15_49">FRDA 15-49 ans</option>
                          <option value="F_25_49">Femmes 25-49 ans</option>
                          <option value="F_25_59">Femmes 25-59 ans</option>
                          <option value="F_35_49">Femmes 35-49 ans</option>
                          <option value="F_35_59">Femmes 35-59 ans</option>
                          <option value="E_25_49">Ensemble 25-49 ans</option>
                          <option value="E_25_59">Ensemble 25-59 ans</option>
                          <option value="E_35_49">Ensemble 35-49 ans</option>
                          <option value="E_35_59">Ensemble 35-59 ans</option>
                          <option value="ICSP_25_49">ICSP+ 25-49 ans</option>
                          <option value="RDA_60">RDA -60 ans</option>
                          <option value="H_25_49">Hommes 25-49 ans</option>
                          <option value="H_25_59">Hommes 25-59 ans</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Choix possibles
                        </label>
                        {formData.is_pda_challenge && (
                          <div className="space-y-2">
                            {[
                              'Moins de 5 %',
                              '5 à 10 %',
                              '10 à 15 %',
                              '15 à 20 %',
                              '20 à 25 %',
                              '25 à 30 %',
                              '30 à 35 %',
                              '35 à 40 %',
                              '40 à 45 %',
                              '45 à 50 %',
                              'Plus de 50 %'
                            ].map((range) => (
                              <div key={range} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`range_${range}`}
                                  checked={formData.bonus_choices.includes(range)}
                                  onChange={(e) => {
                                    let newChoices = [...formData.bonus_choices];
                                    if (e.target.checked) {
                                      newChoices.push(range);
                                    } else {
                                      newChoices = newChoices.filter(choice => choice !== range);
                                    }
                                    handleChange('bonus_choices', newChoices);
                                  }}
                                  className="mr-2 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <label 
                                  htmlFor={`range_${range}`}
                                  className="text-sm text-gray-700 dark:text-gray-300 select-none"
                                >
                                  {range}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  <div className={formData.is_pda_challenge ? "hidden" : ""}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Choix possibles
                    </label>
                    <div className="space-y-2">
                      {formData.bonus_choices.map((choice, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={choice}
                            onChange={(e) => {
                              const newChoices = [...formData.bonus_choices];
                              newChoices[index] = e.target.value;
                              handleChange('bonus_choices', newChoices);
                            }}
                            className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Choix possible"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newChoices = formData.bonus_choices.filter((_, i) => i !== index);
                              handleChange('bonus_choices', newChoices);
                            }}
                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleChange('bonus_choices', [...formData.bonus_choices, ''])}
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                      >
                        + Ajouter un choix
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bonne réponse
                    </label>
                    <input
                      type="text"
                      value={formData.bonus_answer}
                      onChange={(e) => handleChange('bonus_answer', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="La bonne réponse au bonus"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleShowForm}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#252A34] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors order-2 sm:order-1"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors order-1 sm:order-2"
                >
                  {editingProgramId ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer le programme "${programToDelete?.name}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setProgramToDelete(null);
        }}
      />
    </div>
  );
};

export default AdminPage;