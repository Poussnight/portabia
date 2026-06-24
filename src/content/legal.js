/* PortabIA — contenu légal (FR). Conçu par E²SN — Guillaume BOUTON. Apache-2.0.
 * Conforme RGPD / CNIL / IA Act. Pas de CGV (service gratuit). */

export const LEGAL = {
  mentions: {
    title: 'Mentions légales',
    blocks: [
      ['Éditeur', 'PortabIA est édité et opéré par E²SN — Guillaume BOUTON. Contact : contact@essn.fr.'],
      ['Directeur de la publication', 'Guillaume BOUTON.'],
      ['Hébergement', 'Site hébergé au sein de l’Union européenne (France).'],
      ['Nature du service', 'Service en ligne gratuit et open-source (licence Apache-2.0) de portabilité d’historique/contexte entre assistants IA.'],
      ['Propriété intellectuelle', 'Le code source est publié sous licence Apache-2.0 ; toute réutilisation doit conserver l’attribution « E²SN — Guillaume BOUTON » (voir le fichier NOTICE).'],
      ['Marques', 'Claude, ChatGPT, Codex, Gemini, Mistral, Le Chat, Grok et GitHub Copilot sont cités à titre nominatif pour décrire l’interopérabilité. PortabIA n’est ni affilié ni sponsorisé par leurs détenteurs respectifs.'],
    ],
  },
  cgu: {
    title: 'Conditions générales d’utilisation',
    blocks: [
      ['1. Objet', 'Les présentes CGU régissent l’utilisation de PortabIA, outil gratuit de portabilité de contexte entre assistants IA.'],
      ['2. Gratuité', 'Le service est entièrement gratuit, sans compte obligatoire pour la migration simple, sans publicité.'],
      ['3. Fonctionnement « Bring Your Own AI »', 'PortabIA n’accède à aucune IA et n’effectue aucun traitement par IA. Il génère des prompts et transforme vos fichiers localement, dans votre navigateur. C’est vous qui exécutez les prompts dans VOTRE propre assistant, sur vos propres comptes. Vous restez responsable du respect des conditions d’utilisation des services tiers concernés.'],
      ['4. Confidentialité du contenu', 'Le contenu que vous migrez est traité uniquement dans votre navigateur et n’est jamais transmis à nos serveurs.'],
      ['5. Absence de garantie', 'Le service est fourni « en l’état », sans garantie de résultat. La fidélité de la migration dépend des plateformes tierces, qui peuvent évoluer. Vérifiez toujours le résultat avant usage.'],
      ['6. Responsabilité', 'E²SN ne saurait être tenu responsable d’une perte de données, d’une incompatibilité ou d’un usage non conforme aux conditions des IA tierces.'],
      ['7. Propriété intellectuelle', 'PortabIA est open-source sous licence Apache-2.0. L’attribution à E²SN — Guillaume BOUTON doit être conservée en cas de réutilisation.'],
      ['8. Droit applicable', 'Droit français. Pour toute question : contact@essn.fr.'],
    ],
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    blocks: [
      ['Principe « deux couches »', 'Couche 1 — le CONTENU de migration (vos conversations, règles, mémoire) est traité à 100 % dans votre navigateur et n’est JAMAIS envoyé ni stocké sur nos serveurs. Couche 2 — si vous créez un compte (fonctionnalités avancées, à venir), seules votre identité et des métadonnées d’action (IA source/cible, périmètre, date — pas le contenu) sont conservées, avec votre consentement.'],
      ['Bases légales (RGPD Art. 6)', 'Exécution du service pour le compte ; consentement pour le rappel téléphonique et les communications. Le droit à la portabilité (Art. 20) est au cœur de l’outil.'],
      ['Données du compte (si inscription)', 'Nom, e-mail, téléphone, fonction professionnelle, organisation. Le rappel téléphonique n’a lieu qu’avec votre consentement explicite, révocable à tout moment.'],
      ['Conservation', 'Données de compte : durée d’usage du service ; métadonnées d’action : supprimables à tout moment. Aucune conservation du contenu migré.'],
      ['Vos droits (Art. 15-22)', 'Accès, rectification, suppression, portabilité, opposition. Exercice : contact@essn.fr.'],
      ['Cookies / traceurs', 'Aucun traceur publicitaire. Aucun cookie de suivi sans votre consentement (CNIL). Le service fonctionne sans compte.'],
      ['Sécurité', 'Chiffrement en transit, accès restreint, secrets hors dépôt, protection contre les accès non autorisés.'],
      ['Contact / DPO', 'contact@essn.fr.'],
    ],
  },
  transmission: {
    title: 'Transmission d’informations aux IA (transparence IA Act)',
    blocks: [
      ['PortabIA ne transmet rien aux IA', 'PortabIA n’envoie aucune donnée à une intelligence artificielle. L’outil produit des prompts et des fichiers que VOUS choisissez de copier dans VOTRE assistant.'],
      ['Ce que vous transmettez vous-même', 'Lorsque vous collez un prompt généré dans votre IA (source ou cible), c’est VOUS qui transmettez ce contenu à ce service tiers, sur votre compte. Ce transfert est soumis aux conditions et à la politique de confidentialité de l’IA concernée.'],
      ['Contenu généré par IA (Art. 50 IA Act)', 'Les sorties produites par votre IA après import sont du contenu généré par une IA. Vérifiez-les et adaptez-les avant tout usage.'],
      ['Anonymisation', 'PortabIA peut pseudonymiser localement les données sensibles (e-mails, clés, chemins, noms) avant de générer les fichiers, pour limiter ce qui transite vers vos IA.'],
    ],
  },
}

export const LEGAL_ORDER = ['cgu', 'mentions', 'confidentialite', 'transmission']
