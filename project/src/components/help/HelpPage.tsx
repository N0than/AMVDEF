import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Mail } from 'lucide-react';

interface FAQSectionProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const FAQSection = ({ title, children, isOpen, onToggle }: FAQSectionProps) => (
  <div 
    className={`bg-white dark:bg-[#1B2028] rounded-lg shadow-sm overflow-hidden transition-all duration-300 ${
      isOpen ? 'mb-4 lg:mb-6' : 'mb-3 lg:mb-4'
    }`}
  >
    <button
      onClick={onToggle} 
      className="w-full px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="text-purple-500">
          <HelpCircle size={20} className="lg:w-6 lg:h-6" />
        </div>
        <h2 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      <div className="text-gray-400">
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
    </button>
    <div
      className={`overflow-hidden transition-all duration-300 ${
        isOpen ? 'max-h-[50rem]' : 'max-h-0'
      }`}
    >
      <div className="px-4 lg:px-6 pb-4 lg:pb-6 text-sm lg:text-base text-gray-600 dark:text-gray-300">
        {children}
      </div>
    </div>
  </div>
);

const HelpPage = () => {
  const [openSection, setOpenSection] = useState('how-it-works');

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? '' : section);
  };

  return (
    <div className="space-y-6 lg:space-y-8 px-4 lg:px-0">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6 lg:mb-8">
        Aide
      </h1>

      <FAQSection 
        title="Comment fonctionne Audience Masters ?"
        isOpen={openSection === 'how-it-works'}
        onToggle={() => toggleSection('how-it-works')}
      >
        <div className="space-y-4">
          <p>
            Audience Masters est une plateforme dédiée aux prévisions d'audience des programmes télévisés. Comparez vos estimations, explorez les classements et tentez de devenir le véritable "Maître des Audiences".
          </p>
        </div>
      </FAQSection>

      <FAQSection 
        title="Comment faire un pronostic ?"
        isOpen={openSection === 'how-to-predict'}
        onToggle={() => toggleSection('how-to-predict')}
      >
        <div className="space-y-4">
          <p>
            Pour pronostiquer, sélectionnez une émission dans la liste disponible sur la page d'accueil.
          </p>
          <p>
            Entrez votre estimation d'audience (en millions de téléspectateurs) et validez.
          </p>
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-white mb-3">À noter :</p>
            <ul className="list-disc list-inside space-y-3 text-sm">
              <li>Vous ne pouvez faire qu'un seul pronostic par programme</li>
              <li>Les pronostics sont définitifs une fois validés</li>
              <li>Les résultats sont disponibles le lendemain de la diffusion</li>
            </ul>
          </div>
        </div>
      </FAQSection>

      <FAQSection 
        title="Comment consulter les classements ?"
        isOpen={openSection === 'rankings'}
        onToggle={() => toggleSection('rankings')}
      >
        <div className="space-y-4">
          <p>
            Vous pouvez consulter les classements en cliquant sur l'onglet "Classement Joueurs" dans la barre latérale.
          </p>
          <p className="mt-2">
            Vous y trouverez le classement de tous les joueurs, basé à la fois sur les points gagnés et sur leur % de précision.
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Types de classements</h3>
              <ul className="list-disc list-inside space-y-2 text-sm px-2">
                <li>Classement général</li>
                <li>Classement mensuel</li>
                <li>Classement hebdomadaire</li>
                <li>Classement par genre</li>
              </ul>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Critères de classement</h3>
              <ul className="list-disc list-inside space-y-2 text-sm px-2">
                <li>Points totaux</li>
                <li>Pourcentage de précision</li>
                <li>Nombre de pronostics</li>
              </ul>
            </div>
          </div>
        </div>
      </FAQSection>

      <FAQSection 
        title="Comment sont calculés les points ?"
        isOpen={openSection === 'scoring'}
        onToggle={() => toggleSection('scoring')}
      >
        <div className="space-y-4">
          <p>
            Les points sont attribués en fonction de la précision de votre estimation d’audience. Plus vous êtes proche de l’audience réelle, plus vous marquez de points.
          </p>
          
          <div className="mt-4 space-y-4">
            <p>Voici la grille de calcul utilisée :</p>
            
            <ul className="list-disc list-inside space-y-2 text-sm px-2">
            <li>💯 <strong>100 points</strong> si votre estimation est ≥ 95% de l’audience réelle</li>
            <li>🎯 <strong>80 points</strong> si votre estimation est ≥ 90%</li>
            <li>🎯 <strong>60 points</strong> si votre estimation est ≥ 85%</li>
            <li>🎯 <strong>50 points</strong> si votre estimation est ≥ 80%</li>
            <li>📉 <strong>30 points</strong> si votre estimation est ≥ 70%</li>
            <li>📉 <strong>20 points</strong> si votre estimation est ≥ 60%</li>
            <li>📉 <strong>10 points</strong> si votre estimation est ≥ 50%</li>
            <li>❌ <strong>0 point</strong> si votre estimation est &lt; 50% de l’audience réelle</li>
            </ul>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Exemple : si l’audience réelle est de <strong>5.0 millions</strong> et que vous avez prédit <strong>4.6 millions</strong>, votre précision est de 92% → vous gagnez <strong>80 points</strong>.
          </p>
        </div>
      </FAQSection>

      <FAQSection 
        title="Comment fonctionne le bonus Foot ?"
        isOpen={openSection === 'matchBonus'}
        onToggle={() => toggleSection('matchBonus')}
      >
        <div className="space-y-4">
          <p>
            Pour les matchs de <strong>Football</strong>, vous pouvez également pronostiquer le score du match en plus de l’audience.
          </p>
          <p>
            Le bonus foot impacte directement vos <strong>pronostics d’audience</strong> :
          </p>
          <ul className="list-disc list-inside space-y-3 text-sm">
            <li>⚽️ <strong>Score exact</strong> : vos points sont <strong>doublés</strong></li>
            <li>✅ <strong>Bon résultat</strong> (victoire, défaite ou match nul correct) : vos points sont <strong>augmentés de 50%</strong></li>
            <li>❌ <strong>Résultat incorrect</strong> : vous ne gagnez <strong>aucun point</strong></li>
          </ul>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Exemple : vous gagnez 80 points avec votre pronostic d’audience. Si vous avez le <strong>score exact</strong>, vous obtenez <strong>160 points</strong>. Si vous avez seulement le bon résultat, vous obtenez <strong>120 points</strong>. Sinon, vous obtenez <strong>0 point</strong>.
          </p>
        </div>
      </FAQSection>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 lg:p-8 text-white">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 lg:gap-6">
          <div className="hidden sm:block">
            <Mail size={32} />
          </div>
          <div>
            <h2 className="text-xl lg:text-2xl font-bold mb-3 lg:mb-4 text-center lg:text-left">Besoin d'aide supplémentaire ?</h2>
            <p className="mb-4 lg:mb-6 text-purple-100 text-center lg:text-left">
              Si vous avez des questions ou des problèmes, n'hésitez pas à nous contacter par email : hello@audiencemasters.fr
            </p>
            <div className="flex justify-center lg:justify-start">
              <a
                href="mailto:hello@audiencemasters.fr"
                className="inline-flex items-center gap-2 bg-white text-purple-600 px-5 py-2.5 lg:px-6 lg:py-3 rounded-lg font-medium hover:bg-purple-50 transition-colors"
              >
                <Mail size={18} className="lg:w-5 lg:h-5" />
                Contactez-nous
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
