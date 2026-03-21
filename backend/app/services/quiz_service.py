# ###########################################################################
# # quiz_service.py — Logique metier des quiz
# # Rotation 2 categories/semaine + quiz culture G mensuel
# # 15 questions par quiz, difficulte progressive (easy/medium/hard)
# # Banque de 60+ questions par categorie, jamais de repetition (hash MD5)
# # Leaderboard par quiz et classement mensuel agrege
# ###########################################################################

"""Quiz service: rotation 2 categories/week + monthly culture G.

All quizzes: 15 questions.
  Weekly: 6 easy + 5 medium + 4 hard.
  Monthly culture G: 4 easy + 6 medium + 5 hard (harder, from all categories).

Easy questions include fun_fact (blague/anecdote).
Questions are never repeated (tracked by hash).
"""

import calendar
import hashlib
import logging
import random
from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.category import Category
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt
from app.models.user import User
from app.schemas.quiz import (
    QuizOut, QuestionOut, QuizResultOut, QuizSummary, WinnerOut,
    LeaderboardEntry, LeaderboardOut,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Huge question bank – 60+ questions per category (easy / medium / hard)
# Easy questions have a "f" key = fun_fact (blague/anecdote affichee apres la reponse)
# The system picks 15 per quiz and never repeats.
# ---------------------------------------------------------------------------

QUESTION_BANK: dict[str, list[dict]] = {
    "astronomy": [
        # === EASY (20) ===
        {"q": "Quelle est la planète la plus proche du Soleil ?", "opts": ["Vénus", "Mercure", "Mars", "Terre"], "a": 1, "d": "easy", "f": "Mercure est si proche du Soleil qu'une année là-bas ne dure que 88 jours... même pas le temps de finir une série Netflix !"},
        {"q": "Combien de planètes compte le système solaire ?", "opts": ["7", "8", "9", "10"], "a": 1, "d": "easy", "f": "Pluton a été rétrogradée en 2006... elle est toujours en thérapie depuis."},
        {"q": "Quel astre éclaire la Terre le jour ?", "opts": ["Mon écran de téléphone", "Le Soleil", "L'étoile du berger", "La Lune en mode jour"], "a": 1, "d": "easy", "f": "Le Soleil représente 99,86% de la masse du système solaire. Les planètes ? Des miettes sur sa table."},
        {"q": "La Lune est un satellite de quelle planète ?", "opts": ["Mars", "Vénus", "La Terre", "Elle est indépendante"], "a": 2, "d": "easy", "f": "La Lune s'éloigne de la Terre de 3,8 cm par an. Même elle a besoin d'espace dans la relation."},
        {"q": "Quelle planète est surnommée la planète rouge ?", "opts": ["Jupiter", "Saturne", "Mars", "Vénus"], "a": 2, "d": "easy", "f": "Mars est rouge à cause de la rouille (oxyde de fer). En gros, c'est une planète qui n'a pas mis d'antirouille."},
        {"q": "Le Soleil est une étoile ou une planète ?", "opts": ["Une grosse ampoule", "Une étoile", "Une planète en feu", "Un astéroïde lumineux"], "a": 1, "d": "easy", "f": "Le Soleil brûle 600 millions de tonnes d'hydrogène par seconde. Ta facture d'énergie, c'est rien à côté."},
        {"q": "Quelle planète a de grands anneaux visibles ?", "opts": ["Mars (elle les cache bien)", "Neptune", "Saturne", "La Terre (le wifi)"], "a": 2, "d": "easy", "f": "Les anneaux de Saturne sont composés de glace et de roche. C'est le plus grand bar à glaçons du système solaire !"},
        {"q": "Comment s'appelle notre galaxie ?", "opts": ["Andromède", "La Voie lactée", "La galaxie Samsung", "Triangulum"], "a": 1, "d": "easy", "f": "La Voie lactée contient entre 100 et 400 milliards d'étoiles. Et toi t'arrives même pas à voir les étoiles à cause de la pollution lumineuse."},
        {"q": "Quel véhicule va dans l'espace ?", "opts": ["Un Uber premium", "Une fusée", "Un sous-marin inversé", "Un hélicoptère très motivé"], "a": 1, "d": "easy", "f": "Une fusée doit atteindre 28 000 km/h pour quitter la Terre. Même les livreurs Uber Eats ne vont pas aussi vite."},
        {"q": "Quelle est la plus grande planète du système solaire ?", "opts": ["Saturne", "Jupiter", "Neptune", "Uranus"], "a": 1, "d": "easy", "f": "Jupiter est tellement grosse qu'on pourrait y mettre 1 300 Terres. C'est la grande sœur qui prend toute la place dans la chambre."},
        {"q": "Que reflète la Lune ?", "opts": ["Sa propre lumière", "La lumière du Soleil", "La lumière de nos espoirs", "La 4G de la Terre"], "a": 1, "d": "easy", "f": "La Lune ne reflète que 12% de la lumière reçue. C'est le miroir le moins efficace de l'univers."},
        {"q": "Combien de temps la Terre met-elle pour tourner autour du Soleil ?", "opts": ["1 mois (speed run)", "1 an", "1 jour", "Ça dépend des embouteillages"], "a": 1, "d": "easy", "f": "La Terre voyage à 107 000 km/h autour du Soleil. Tu te plains d'être fatigué sans rien faire ? Normal, t'es sur un manège spatial."},
        {"q": "Qu'est-ce qu'une étoile filante ?", "opts": ["Une étoile licenciée", "Un météore qui brûle dans l'atmosphère", "Un satellite tombé", "Un avion très haut"], "a": 1, "d": "easy", "f": "La plupart des étoiles filantes sont des grains de poussière pas plus gros qu'un grain de sable. Petit mais spectaculaire !"},
        {"q": "Quelle planète est la plus éloignée du Soleil ?", "opts": ["Uranus", "Saturne", "Neptune", "Pluton (elle boude toute seule)"], "a": 2, "d": "easy", "f": "Neptune met 165 ans pour faire le tour du Soleil. Depuis sa découverte en 1846, elle n'a même pas encore fait 2 tours !"},
        {"q": "Que porte un astronaute dans l'espace ?", "opts": ["Un costume 3 pièces", "Un scaphandre spatial", "Un pyjama pressurisé", "Un gilet de sauvetage"], "a": 1, "d": "easy", "f": "Un scaphandre spatial coûte environ 12 millions de dollars. Le prix d'un appart à Paris, sauf que là t'as la vue sur la Terre entière."},
        {"q": "Quel est le premier Homme à avoir marché sur la Lune ?", "opts": ["Buzz Aldrin", "Youri Gagarine", "Neil Armstrong", "John Glenn"], "a": 2, "d": "easy", "f": "Les empreintes de Neil Armstrong sont encore sur la Lune. Pas de vent, pas de pluie, pas de femme de ménage là-haut."},
        {"q": "Quelle est la couleur dominante de la Terre vue de l'espace ?", "opts": ["Verte", "Bleue", "Marron", "Blanche"], "a": 1, "d": "easy", "f": "71% de la Terre est recouverte d'eau. Et pourtant, on galère toujours à trouver une place à la plage en été."},
        {"q": "Le système solaire fait partie de quelle galaxie ?", "opts": ["Andromède", "La Voie lactée", "Centaurus A", "Whirlpool"], "a": 1, "d": "easy", "f": "Le nom 'Voie lactée' vient du grec ancien. Les Grecs pensaient qu'Héra avait renversé son lait dans le ciel !"},
        {"q": "Quelle agence spatiale a envoyé les missions Apollo ?", "opts": ["ESA", "Roscosmos", "NASA", "JAXA"], "a": 2, "d": "easy", "f": "La NASA a été créée en 1958, un an après le Spoutnik soviétique. Rien de tel qu'un rival pour se motiver !"},
        {"q": "Combien de temps la Terre met-elle pour tourner sur elle-même ?", "opts": ["1 heure", "12 heures", "24 heures", "48 heures"], "a": 2, "d": "easy", "f": "En vrai c'est 23h56min, pas exactement 24h. On nous ment depuis le CP."},
        # === MEDIUM (20) ===
        {"q": "Quel est le plus grand satellite naturel de Jupiter ?", "opts": ["Europe", "Io", "Ganymède", "Callisto"], "a": 2, "d": "medium"},
        {"q": "En quelle année l'Homme a-t-il marché sur la Lune pour la première fois ?", "opts": ["1965", "1969", "1972", "1961"], "a": 1, "d": "medium"},
        {"q": "Quelle galaxie est la plus proche de la Voie lactée ?", "opts": ["Triangulum", "Andromède", "Sombrero", "NGC 1300"], "a": 1, "d": "medium"},
        {"q": "Quel télescope spatial a remplacé Hubble en 2022 ?", "opts": ["Spitzer", "Kepler", "James Webb", "Chandra"], "a": 2, "d": "medium"},
        {"q": "Quelle est l'étoile la plus proche de la Terre (hors Soleil) ?", "opts": ["Sirius", "Proxima du Centaure", "Alpha Centauri A", "Bételgeuse"], "a": 1, "d": "medium"},
        {"q": "De quoi est principalement composé le Soleil ?", "opts": ["Hélium (2e élément, piège !)", "Plasma de fer", "Hydrogène", "Carbone incandescent"], "a": 2, "d": "medium"},
        {"q": "Combien de temps la lumière du Soleil met-elle pour atteindre la Terre ?", "opts": ["1 minute", "8 minutes", "15 minutes", "30 secondes"], "a": 1, "d": "medium"},
        {"q": "Quelle planète tourne sur elle-même en sens inverse ?", "opts": ["Mars", "Vénus", "Neptune", "Jupiter"], "a": 1, "d": "medium"},
        {"q": "Qu'est-ce qu'une naine blanche ?", "opts": ["Un petit astéroïde", "Un stade final d'étoile", "Un satellite", "Une nébuleuse"], "a": 1, "d": "medium"},
        {"q": "Quelle sonde a survolé Pluton en 2015 ?", "opts": ["Voyager 2", "New Horizons", "Cassini", "Juno"], "a": 1, "d": "medium"},
        {"q": "Combien de lunes possède Mars ?", "opts": ["0", "1", "2", "4"], "a": 2, "d": "medium"},
        {"q": "Quel phénomène crée les aurores boréales ?", "opts": ["Les comètes", "Le vent solaire", "Les météores", "La gravité lunaire"], "a": 1, "d": "medium"},
        {"q": "Quelle est la température de surface du Soleil (environ) ?", "opts": ["1 000°C", "5 500°C", "15 000°C", "100 000°C"], "a": 1, "d": "medium"},
        {"q": "Quel objet céleste a une queue quand il s'approche du Soleil ?", "opts": ["Astéroïde", "Comète", "Météorite", "Planète naine"], "a": 1, "d": "medium"},
        {"q": "Combien de missions Apollo ont atterri sur la Lune ?", "opts": ["3", "6", "9", "12"], "a": 1, "d": "medium"},
        {"q": "Quelle est la planète la plus chaude du système solaire ?", "opts": ["Mercure (la plus proche, mais non !)", "Vénus", "Mars", "Jupiter"], "a": 1, "d": "medium"},
        {"q": "Quel rover a atterri sur Mars en 2021 ?", "opts": ["Curiosity", "Opportunity", "Perseverance", "Spirit"], "a": 2, "d": "medium"},
        {"q": "Qu'est-ce que la ceinture de Kuiper ?", "opts": ["Un anneau de Saturne", "Une zone d'astéroïdes au-delà de Neptune", "Un bras de la Voie lactée", "Une constellation"], "a": 1, "d": "medium"},
        {"q": "Quelle planète a la Grande Tache Rouge ?", "opts": ["Mars", "Saturne", "Jupiter", "Neptune"], "a": 2, "d": "medium"},
        {"q": "Combien d'années-lumière mesure la Voie lactée (diamètre) ?", "opts": ["10 000", "50 000", "100 000", "1 million"], "a": 2, "d": "medium"},
        # === HARD (20) ===
        {"q": "Quel est le plus grand volcan du système solaire ?", "opts": ["Mauna Kea", "Olympus Mons", "Ascraeus Mons", "Elysium Mons"], "a": 1, "d": "hard"},
        {"q": "Quelle sonde a quitté le système solaire en premier ?", "opts": ["Pioneer 10", "Voyager 1", "New Horizons", "Cassini"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que la limite de Roche ?", "opts": ["Distance min avant dislocation par marée", "Bord du système solaire", "Limite de l'atmosphère", "Zone habitable"], "a": 0, "d": "hard"},
        {"q": "Quelle est la vitesse de la lumière (approximative) ?", "opts": ["100 000 km/s", "200 000 km/s", "300 000 km/s", "400 000 km/s"], "a": 2, "d": "hard"},
        {"q": "Qu'est-ce qu'un pulsar ?", "opts": ["Trou noir", "Étoile à neutrons en rotation rapide", "Naine rouge", "Quasar"], "a": 1, "d": "hard"},
        {"q": "Quel est le paradoxe de Fermi ?", "opts": ["Temps relatif en orbite", "Absence de preuves de vie extraterrestre", "Expansion infinie de l'univers", "Effondrement gravitationnel"], "a": 1, "d": "hard"},
        {"q": "Quelle est la masse du Soleil par rapport à la Terre ?", "opts": ["1 000×", "100 000×", "333 000×", "1 million×"], "a": 2, "d": "hard"},
        {"q": "Qu'est-ce que l'énergie noire ?", "opts": ["Énergie des trous noirs", "Force accélérant l'expansion de l'univers", "Rayonnement cosmique", "Matière invisible"], "a": 1, "d": "hard"},
        {"q": "Quel événement a créé les éléments lourds comme l'or ?", "opts": ["Big Bang", "Supernova / kilonova", "Fusion stellaire", "Impact d'astéroïdes"], "a": 1, "d": "hard"},
        {"q": "Quelle est la particularité de l'orbite de Pluton ?", "opts": ["Circulaire parfaite", "Très elliptique et inclinée", "Rétrograde", "Fixe"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que le rayonnement cosmique de fond (CMB) ?", "opts": ["Lumière des premières étoiles", "Résidu du Big Bang", "Émission des trous noirs", "Réflexion des galaxies"], "a": 1, "d": "hard"},
        {"q": "Combien de temps faut-il à la lumière pour traverser la Voie lactée ?", "opts": ["1 000 ans", "10 000 ans", "100 000 ans", "1 million d'ans"], "a": 2, "d": "hard"},
        {"q": "Qu'est-ce qu'un magnétar ?", "opts": ["Étoile très magnétique", "Planète magnétique", "Satellite artificiel", "Type de comète"], "a": 0, "d": "hard"},
        {"q": "Quel phénomène Einstein a-t-il prédit concernant la lumière et la gravité ?", "opts": ["Effet Doppler", "Lentille gravitationnelle", "Diffraction", "Réfraction"], "a": 1, "d": "hard"},
        {"q": "Quelle est la densité moyenne d'un trou noir stellaire ?", "opts": ["Très faible", "Similaire à l'eau", "Infinie au centre", "Égale au Soleil"], "a": 2, "d": "hard"},
        {"q": "Qu'est-ce que la sphère de Hill ?", "opts": ["Zone d'influence gravitationnelle d'un corps", "Limite de l'atmosphère", "Forme d'un astéroïde", "Orbite de Hill"], "a": 0, "d": "hard"},
        {"q": "Quel est le temps orbital de Neptune autour du Soleil ?", "opts": ["84 ans", "165 ans", "248 ans", "365 ans"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que l'horizon des événements ?", "opts": ["Limite observable de l'univers", "Frontière d'un trou noir", "Bord d'une galaxie", "Zone de formation stellaire"], "a": 1, "d": "hard"},
        {"q": "Quelle mission a découvert les ceintures de radiation de Van Allen ?", "opts": ["Apollo 11", "Explorer 1", "Sputnik 1", "Gemini 4"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que la nucléosynthèse primordiale ?", "opts": ["Fusion dans les étoiles", "Formation d'éléments légers après le Big Bang", "Fission nucléaire", "Décroissance radioactive"], "a": 1, "d": "hard"},
    ],
    "science_health": [
        # === EASY (20) ===
        {"q": "Quel organe pompe le sang dans le corps ?", "opts": ["Le foie", "Le cœur", "Le cerveau", "L'estomac (après un kebab)"], "a": 1, "d": "easy", "f": "Le cœur bat environ 100 000 fois par jour. C'est le seul muscle qui bosse plus que toi."},
        {"q": "Combien de sens a l'être humain ?", "opts": ["3 (et pas le sens de l'humour)", "4", "5", "6 (si on compte le wifi)"], "a": 2, "d": "easy", "f": "En réalité, les scientifiques pensent qu'on en a plus de 20, comme l'équilibre ou la faim. Le 6e sens, c'est quand ton estomac sait qu'il est midi."},
        {"q": "Quel gaz respirons-nous ?", "opts": ["Azote (78% de l'air, piège !)", "CO2", "Oxygène", "Hélium (on aurait des voix aiguës)"], "a": 2, "d": "easy", "f": "L'air contient 78% d'azote et seulement 21% d'oxygène. On respire surtout de l'azote mais c'est l'oxygène qui fait tout le travail !"},
        {"q": "Quel est le plus grand organe du corps humain ?", "opts": ["Le foie", "Le cerveau", "La peau", "L'intestin grêle (7 mètres !)"], "a": 2, "d": "easy", "f": "La peau d'un adulte pèse environ 3-4 kg et fait 2 m². C'est ton plus grand organe et aussi ton plus gros vêtement gratuit."},
        {"q": "L'eau est composée d'hydrogène et de quoi ?", "opts": ["Carbone", "Azote", "Oxygène", "Du sel (c'est la mer ça)"], "a": 2, "d": "easy", "f": "H2O : 2 atomes d'hydrogène pour 1 d'oxygène. C'est le cocktail le plus simple et le plus populaire de l'univers."},
        {"q": "Quel animal produit du miel ?", "opts": ["La guêpe (méchante version)", "La fourmi", "L'abeille", "Le bourdon (il essaie)"], "a": 2, "d": "easy", "f": "Une abeille produit à peine 1/12e de cuillère à café de miel dans toute sa vie. Respecte ton pot de miel."},
        {"q": "Combien de jours dure environ un mois ?", "opts": ["28", "30", "31", "Ça dépend du mois"], "a": 3, "d": "easy", "f": "Février est le seul mois qui peut avoir 28 ou 29 jours. Il a clairement perdu au tirage au sort."},
        {"q": "Quelle est la formule chimique de l'eau ?", "opts": ["CO2", "H2O", "NaCl", "O2"], "a": 1, "d": "easy", "f": "Si tu mélanges de l'hydrogène et de l'oxygène sans précaution, ça explose. L'eau, c'est une explosion qui a bien tourné."},
        {"q": "Quel est l'os le plus long du corps humain ?", "opts": ["L'humérus", "Le tibia", "Le fémur", "Le radius"], "a": 2, "d": "easy", "f": "Le fémur est plus solide que du béton. Tes jambes sont littéralement des piliers de bunker."},
        {"q": "Combien de dents a un adulte (normalement) ?", "opts": ["28", "30", "32", "36"], "a": 2, "d": "easy", "f": "Les dents de sagesse s'appellent ainsi car elles poussent vers 17-25 ans, l'âge de la 'sagesse'. Spoiler : ça n'a rendu personne plus sage."},
        {"q": "Quelle partie du corps contrôle la pensée ?", "opts": ["Le cœur (les poètes disent oui)", "Le foie", "Le cerveau", "L'estomac (quand j'ai faim, oui)"], "a": 2, "d": "easy", "f": "Le cerveau consomme 20% de l'énergie du corps alors qu'il ne pèse que 2%. C'est le collègue qui mange tout au pot commun."},
        {"q": "Quel fruit est riche en vitamine C ?", "opts": ["Banane", "Orange", "Pomme", "Avocat (c'est un fruit !)"], "a": 1, "d": "easy", "f": "Le poivron rouge contient en fait plus de vitamine C que l'orange ! Mais bon, un jus de poivron au petit-déj, ça fait moins rêver."},
        {"q": "Que doit-on boire beaucoup chaque jour ?", "opts": ["Du jus de fruits", "Du lait", "De l'eau", "Du café (les développeurs disent oui)"], "a": 2, "d": "easy", "f": "Le corps humain est composé d'environ 60% d'eau. Techniquement, tu es un concombre avec des émotions."},
        {"q": "Combien de poumons avons-nous ?", "opts": ["1 (mais gros)", "2", "3 (un de rechange)", "4"], "a": 1, "d": "easy", "f": "Le poumon droit est plus gros que le gauche car le cœur prend de la place à gauche. Même tes organes se battent pour le territoire."},
        {"q": "Quelle température corporelle est normale ?", "opts": ["35°C", "37°C", "39°C (mode turbo)", "42°C"], "a": 1, "d": "easy", "f": "37°C, c'est la température idéale pour que tes enzymes fonctionnent. Ton corps est un thermostat vivant très capricieux."},
        {"q": "Quel organe filtre le sang ?", "opts": ["Le cœur", "Le rein", "Le foie", "L'estomac"], "a": 1, "d": "easy", "f": "Tes reins filtrent environ 180 litres de sang par jour. C'est comme remplir une baignoire... 2 fois."},
        {"q": "Que protège le crâne ?", "opts": ["Le cœur", "Les poumons", "Le cerveau", "L'estomac"], "a": 2, "d": "easy", "f": "Le crâne est composé de 22 os soudés ensemble. C'est le casque de moto intégré depuis la naissance."},
        {"q": "Combien de litres de sang contient un adulte ?", "opts": ["2 litres", "5 litres", "8 litres", "10 litres"], "a": 1, "d": "easy", "f": "5 litres de sang qui font le tour du corps en 1 minute. Ton sang voyage plus vite que toi le matin pour aller au boulot."},
        {"q": "Quel liquide produit l'estomac pour digérer ?", "opts": ["De la bile", "Du suc gastrique", "De la salive", "De l'urine"], "a": 1, "d": "easy", "f": "L'acide de ton estomac est assez puissant pour dissoudre du métal. Heureusement, l'estomac se renouvelle tous les 3-4 jours !"},
        {"q": "Que faut-il faire avant de manger ?", "opts": ["Dormir", "Se laver les mains", "Courir", "Lire"], "a": 1, "d": "easy", "f": "Il y a plus de bactéries sur ton téléphone que sur une cuvette de toilettes. Lave-toi les mains après avoir scrollé aussi !"},
        # === MEDIUM (20) ===
        {"q": "Quel organe produit l'insuline ?", "opts": ["Foie (il fait déjà 500 trucs)", "Pancréas", "Rein", "Glande thyroïde"], "a": 1, "d": "medium"},
        {"q": "Combien d'os compte le squelette humain adulte ?", "opts": ["186", "206", "226", "270 (bébé oui, adulte non !)"], "a": 1, "d": "medium"},
        {"q": "Quel est l'élément chimique le plus abondant dans l'univers ?", "opts": ["Oxygène", "Carbone", "Hydrogène", "Hélium"], "a": 2, "d": "medium"},
        {"q": "Quelle vitamine est produite par l'exposition au soleil ?", "opts": ["Vitamine A", "Vitamine C", "Vitamine D", "Vitamine B12"], "a": 2, "d": "medium"},
        {"q": "Que mesure un sphygmomanomètre ?", "opts": ["La température", "La pression artérielle", "Le taux de sucre", "L'oxygène dans le sang"], "a": 1, "d": "medium"},
        {"q": "Combien de chromosomes possède une cellule humaine ?", "opts": ["23", "44", "46", "48"], "a": 2, "d": "medium"},
        {"q": "Quel gaz expirons-nous principalement ?", "opts": ["Oxygène", "Azote", "Dioxyde de carbone", "Hydrogène"], "a": 2, "d": "medium"},
        {"q": "Qui a découvert la pénicilline ?", "opts": ["Pasteur", "Fleming", "Koch", "Jenner"], "a": 1, "d": "medium"},
        {"q": "Quel est le pH d'une solution neutre ?", "opts": ["0", "5", "7", "14"], "a": 2, "d": "medium"},
        {"q": "Quel groupe sanguin est donneur universel ?", "opts": ["A+", "B-", "AB+", "O-"], "a": 3, "d": "medium"},
        {"q": "Quelle molécule transporte l'oxygène dans le sang ?", "opts": ["Glucose", "Hémoglobine", "Insuline", "Albumine"], "a": 1, "d": "medium"},
        {"q": "Quel est le rôle des globules blancs ?", "opts": ["Transport d'O2", "Défense immunitaire", "Coagulation", "Nutrition"], "a": 1, "d": "medium"},
        {"q": "Quel neurotransmetteur est lié au bonheur ?", "opts": ["Adrénaline", "Sérotonine", "Cortisol", "Mélatonine"], "a": 1, "d": "medium"},
        {"q": "Combien d'heures de sommeil recommandées pour un adulte ?", "opts": ["4-5h", "6-7h", "7-9h", "10-12h"], "a": 2, "d": "medium"},
        {"q": "Quel organe produit la bile ?", "opts": ["L'estomac", "Le pancréas", "Le foie", "La rate"], "a": 2, "d": "medium"},
        {"q": "Qu'est-ce que l'ADN ?", "opts": ["Une protéine", "Un acide aminé", "Le support de l'information génétique", "Une vitamine"], "a": 2, "d": "medium"},
        {"q": "Quel est le muscle le plus puissant du corps ?", "opts": ["Le biceps", "Le cœur", "Le quadriceps", "Le masséter"], "a": 3, "d": "medium"},
        {"q": "Quel type de cellule est affecté par le VIH ?", "opts": ["Globules rouges", "Lymphocytes T CD4", "Plaquettes", "Neurones"], "a": 1, "d": "medium"},
        {"q": "Que signifie 'ARN' ?", "opts": ["Acide ribonucléique", "Acide reducteur naturel", "Agent réactif nucléaire", "Aucune de ces réponses"], "a": 0, "d": "medium"},
        {"q": "Quel est l'effet principal du cortisol ?", "opts": ["Relaxation", "Réponse au stress", "Digestion", "Croissance"], "a": 1, "d": "medium"},
        # === HARD (20) ===
        {"q": "Qu'est-ce que l'apoptose ?", "opts": ["Division cellulaire", "Mort cellulaire programmée", "Mutation génétique", "Migration cellulaire"], "a": 1, "d": "hard"},
        {"q": "Quel est le rôle des mitochondries ?", "opts": ["Synthèse protéique", "Production d'énergie (ATP)", "Stockage d'ADN", "Division cellulaire"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que la méiose ?", "opts": ["Division donnant 2 cellules identiques", "Division donnant 4 cellules haploïdes", "Fusion cellulaire", "Réparation de l'ADN"], "a": 1, "d": "hard"},
        {"q": "Quel est le nombre d'Avogadro (approximatif) ?", "opts": ["6,02 × 10²³", "3,14 × 10²³", "1,6 × 10⁻¹⁹", "9,8 × 10¹"], "a": 0, "d": "hard"},
        {"q": "Qu'est-ce que CRISPR-Cas9 ?", "opts": ["Un médicament", "Un outil d'édition génétique", "Un vaccin", "Un virus"], "a": 1, "d": "hard"},
        {"q": "Quelle est la constante de Planck ?", "opts": ["Vitesse de la lumière", "Constante quantique d'énergie", "Constante gravitationnelle", "Constante de Boltzmann"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que l'épigénétique ?", "opts": ["Étude des mutations", "Modifications de l'expression des gènes sans changer l'ADN", "Clonage", "Thérapie génique"], "a": 1, "d": "hard"},
        {"q": "Quel acide aminé est le plus petit ?", "opts": ["Alanine", "Glycine", "Valine", "Leucine"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que le microbiome ?", "opts": ["Un type de microscope", "L'ensemble des micro-organismes vivant dans le corps", "Une cellule bactérienne", "Un antibiotique"], "a": 1, "d": "hard"},
        {"q": "Quel est le principe de la PCR ?", "opts": ["Séquençage d'ADN", "Amplification d'ADN", "Destruction de virus", "Analyse protéique"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que la barrière hémato-encéphalique ?", "opts": ["Os du crâne", "Membrane filtrant le sang vers le cerveau", "Liquide céphalo-rachidien", "Méninges"], "a": 1, "d": "hard"},
        {"q": "Quel est le rôle des télomères ?", "opts": ["Coder des protéines", "Protéger les extrémités des chromosomes", "Répliquer l'ADN", "Produire de l'énergie"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que l'effet placebo ?", "opts": ["Effet secondaire d'un médicament", "Amélioration par croyance au traitement", "Résistance aux antibiotiques", "Allergie médicamenteuse"], "a": 1, "d": "hard"},
        {"q": "Quelle particule subatomique a une charge négative ?", "opts": ["Proton", "Neutron", "Électron", "Photon"], "a": 2, "d": "hard"},
        {"q": "Qu'est-ce que la théorie des cordes ?", "opts": ["Théorie musicale", "Théorie unificatrice en physique", "Théorie de l'évolution", "Théorie cellulaire"], "a": 1, "d": "hard"},
        {"q": "Quel est le principe d'incertitude de Heisenberg ?", "opts": ["On ne peut pas mesurer position et vitesse simultanément avec précision", "L'énergie se conserve", "La matière est continue", "Le temps est absolu"], "a": 0, "d": "hard"},
        {"q": "Qu'est-ce qu'un prion ?", "opts": ["Un virus", "Une protéine mal repliée infectieuse", "Une bactérie", "Un champignon"], "a": 1, "d": "hard"},
        {"q": "Quel élément a le numéro atomique 79 ?", "opts": ["Argent", "Platine", "Or", "Cuivre"], "a": 2, "d": "hard"},
        {"q": "Qu'est-ce que l'entropie ?", "opts": ["Mesure de l'ordre", "Mesure du désordre", "Mesure de l'énergie", "Mesure de la masse"], "a": 1, "d": "hard"},
        {"q": "Quelle est la demi-vie du carbone 14 ?", "opts": ["1 600 ans", "5 730 ans", "12 000 ans", "50 000 ans"], "a": 1, "d": "hard"},
    ],
    "cinema_series": [
        # === EASY (20) ===
        {"q": "Quel animal est Simba dans Le Roi Lion ?", "opts": ["Un tigre qui rugit mal", "Un lion", "Un chat très ambitieux", "Un guépard avec une crinière"], "a": 1, "d": "easy", "f": "'Simba' signifie 'lion' en swahili. Disney n'a pas trop forcé sur la créativité du prénom."},
        {"q": "Quel super-héros porte un costume rouge et bleu et lance des toiles ?", "opts": ["Batman (mais en couleur)", "Superman", "Spider-Man", "L'Homme-Araignée du métro"], "a": 2, "d": "easy", "f": "Spider-Man a été refusé par plusieurs éditeurs car 'les gens détestent les araignées'. Bien joué Stan Lee d'avoir insisté !"},
        {"q": "Dans quel film un poisson-clown cherche son fils ?", "opts": ["Vaiana", "Le Monde de Nemo", "Ratatouille (non, c'est un rat)", "Shark Tale"], "a": 1, "d": "easy", "f": "Après la sortie du film, la demande de poissons-clowns en animalerie a explosé de 40%. Nemo voulait être libre, pas dans un aquarium !"},
        {"q": "Qui joue le rôle de Jack dans Titanic ?", "opts": ["Brad Pitt", "Johnny Depp", "Leonardo DiCaprio", "Tom Cruise"], "a": 2, "d": "easy", "f": "Leo a failli refuser le rôle car il ne voulait pas auditionner. Le réalisateur l'a convaincu en disant : 'Pas d'audition, pas de rôle.'"},
        {"q": "Combien de films Harry Potter y a-t-il ?", "opts": ["6", "7", "8", "9"], "a": 2, "d": "easy", "f": "Le dernier livre a été coupé en deux films. Warner Bros a inventé la technique du 'on double les bénéfices'."},
        {"q": "Quel studio a créé Toy Story ?", "opts": ["DreamWorks", "Disney", "Pixar", "Illumination"], "a": 2, "d": "easy", "f": "Toy Story (1995) est le premier long-métrage entièrement en images de synthèse. Avant ça, les ordinateurs servaient juste à faire des tableurs."},
        {"q": "Dans quel pays se déroule Squid Game ?", "opts": ["Japon", "Chine", "Corée du Sud", "Thaïlande"], "a": 2, "d": "easy", "f": "Le créateur de Squid Game a mis 10 ans à trouver un producteur. Netflix a dit oui et c'est devenu la série la plus regardée de l'histoire."},
        {"q": "Quel acteur a joué Iron Man dans le MCU ?", "opts": ["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Mark Ruffalo"], "a": 1, "d": "easy", "f": "Robert Downey Jr. a été payé 500 000$ pour le premier Iron Man et 75 millions pour Avengers Endgame. Belle augmentation."},
        {"q": "Quel personnage dit 'Je suis ton père' ?", "opts": ["Yoda", "Dark Vador", "Obi-Wan", "Han Solo"], "a": 1, "d": "easy", "f": "Pendant le tournage, seuls le réalisateur et l'acteur de Vador connaissaient la vraie réplique. Même les autres acteurs ont été surpris !"},
        {"q": "Quelle princesse Disney a des cheveux très longs ?", "opts": ["Cendrillon", "Raiponce", "Belle", "Ariel"], "a": 1, "d": "easy", "f": "Les cheveux de Raiponce font 21 mètres dans le film. L'équipe d'animation a dû créer un logiciel spécial rien que pour ses cheveux."},
        {"q": "Dans quel film des jouets prennent vie ?", "opts": ["Cars", "Toy Story", "Robots", "Coco"], "a": 1, "d": "easy", "f": "Buzz l'Éclair devait s'appeler 'Lunar Larry' au départ. Heureusement qu'ils ont changé d'avis."},
        {"q": "Quel est le nom du bonhomme de neige dans La Reine des Neiges ?", "opts": ["Sven", "Kristoff", "Olaf", "Hans"], "a": 2, "d": "easy", "f": "La chanson 'Libérée, Délivrée' a tellement plu aux producteurs qu'ils ont réécrit tout le scénario autour d'elle."},
        {"q": "Quel héros Marvel porte un bouclier ?", "opts": ["Thor", "Iron Man", "Captain America", "Hulk"], "a": 2, "d": "easy", "f": "Le bouclier de Captain America est en vibranium, un métal fictif. En vrai, celui utilisé sur le tournage est en caoutchouc et rebondit n'importe où."},
        {"q": "Quelle série Netflix parle d'un monde à l'envers ?", "opts": ["Dark", "Stranger Things", "The OA", "Locke & Key"], "a": 1, "d": "easy", "f": "Stranger Things a été refusée par 15 chaînes avant que Netflix dise oui. Comme quoi, même les succès mondiaux se prennent des râteaux."},
        {"q": "Quel est le métier de Shrek ?", "opts": ["Influenceur marais", "Chevalier bio", "Ogre (il vit dans un marais)", "Coach en développement personnel"], "a": 2, "d": "easy", "f": "Shrek a été inspiré par un vrai lutteur français du XIXe siècle, Maurice Tillet, surnommé 'l'Ange Français'. La ressemblance est troublante !"},
        {"q": "Dans quelle saga trouve-t-on Gandalf ?", "opts": ["Harry Potter", "Narnia", "Le Seigneur des Anneaux", "Star Wars"], "a": 2, "d": "easy", "f": "Ian McKellen (Gandalf) a refusé de jouer Dumbledore car l'acteur original avait critiqué son jeu. La guerre des sorciers existe en vrai."},
        {"q": "Quel dessin animé met en scène un rat cuisinier à Paris ?", "opts": ["Coco", "Ratatouille", "Le Monde de Nemo", "Soul"], "a": 1, "d": "easy", "f": "L'équipe de Pixar a pris des cours de cuisine française pour le film. Le budget bouffe de la production a dû être énorme."},
        {"q": "Quel film raconte l'histoire du Titanic ?", "opts": ["Titanic", "Dunkerque", "1917", "Pearl Harbor"], "a": 0, "d": "easy", "f": "Le film Titanic a coûté plus cher que la construction du vrai Titanic (en dollars ajustés). Hollywood > chantier naval."},
        {"q": "Quelle couleur est le costume de Spider-Man ?", "opts": ["Noir", "Vert", "Rouge et bleu", "Jaune"], "a": 2, "d": "easy", "f": "Spider-Man a eu plus de 50 costumes différents dans les comics. Sa garde-robe est plus grande que celle de la plupart des gens."},
        {"q": "Quel est le nom du robot dans Wall-E ?", "opts": ["R2-D2", "Wall-E", "Baymax", "BB-8"], "a": 1, "d": "easy", "f": "Wall-E ne dit presque que 2 mots dans tout le film : 'Wall-E' et 'Eva'. Et pourtant il fait pleurer tout le monde."},
        # === MEDIUM (20) ===
        {"q": "Qui a réalisé Inception ?", "opts": ["Spielberg", "Nolan", "Scorsese", "Tarantino"], "a": 1, "d": "medium"},
        {"q": "Quelle série a le plus d'Emmy Awards ?", "opts": ["Friends", "Breaking Bad", "Game of Thrones", "The Simpsons"], "a": 2, "d": "medium"},
        {"q": "Qui est le réalisateur de Pulp Fiction ?", "opts": ["Ridley Scott", "Coen Brothers", "Quentin Tarantino", "David Lynch"], "a": 2, "d": "medium"},
        {"q": "Dans quelle ville se passe La Casa de Papel ?", "opts": ["Barcelone", "Séville", "Madrid", "Valence"], "a": 2, "d": "medium"},
        {"q": "Quel film de 1994 se passe en prison ?", "opts": ["Seven", "Forrest Gump", "Les Évadés", "Le Roi Lion"], "a": 2, "d": "medium"},
        {"q": "Combien de films composent la trilogie Matrix originale ?", "opts": ["2", "3", "4", "5"], "a": 1, "d": "medium"},
        {"q": "Qui a réalisé le film Parasite (2019) ?", "opts": ["Park Chan-wook", "Bong Joon-ho", "Kim Ki-duk", "Lee Chang-dong"], "a": 1, "d": "medium"},
        {"q": "Quelle série Netflix parle d'échecs ?", "opts": ["Ozark", "The Crown", "Le Jeu de la Dame", "Dark"], "a": 2, "d": "medium"},
        {"q": "Quel acteur joue le Joker dans The Dark Knight ?", "opts": ["Jack Nicholson", "Jared Leto", "Heath Ledger", "Joaquin Phoenix"], "a": 2, "d": "medium"},
        {"q": "Quel film a remporté l'Oscar du meilleur film en 2020 ?", "opts": ["1917", "Joker", "Parasite", "Once Upon a Time in Hollywood"], "a": 2, "d": "medium"},
        {"q": "Dans quel film dit-on 'May the Force be with you' ?", "opts": ["Star Trek", "Star Wars", "Dune", "Interstellar"], "a": 1, "d": "medium"},
        {"q": "Quel réalisateur est connu pour ses films de westerns spaghetti ?", "opts": ["John Ford", "Sergio Leone", "Clint Eastwood", "Sam Peckinpah"], "a": 1, "d": "medium"},
        {"q": "Quelle est la première règle du Fight Club ?", "opts": ["Toujours se battre", "Ne pas parler du Fight Club", "Pas de règles", "Gagner à tout prix"], "a": 1, "d": "medium"},
        {"q": "Quel pays produit Bollywood ?", "opts": ["Pakistan", "Bangladesh", "Inde", "Sri Lanka"], "a": 2, "d": "medium"},
        {"q": "Quel est le vrai nom de Black Widow (MCU) ?", "opts": ["Wanda Maximoff", "Carol Danvers", "Natasha Romanoff", "Peggy Carter"], "a": 2, "d": "medium"},
        {"q": "Quelle série se déroule dans un parc d'attractions avec des robots ?", "opts": ["Humans", "Westworld", "Black Mirror", "Altered Carbon"], "a": 1, "d": "medium"},
        {"q": "Quel film de Miyazaki met en scène une jeune sorcière ?", "opts": ["Mon Voisin Totoro", "Le Voyage de Chihiro", "Kiki la petite sorcière", "Princesse Mononoké"], "a": 2, "d": "medium"},
        {"q": "Combien de saisons a Breaking Bad ?", "opts": ["3", "4", "5", "6"], "a": 2, "d": "medium"},
        {"q": "Qui joue Walter White dans Breaking Bad ?", "opts": ["Aaron Paul", "Bryan Cranston", "Bob Odenkirk", "Dean Norris"], "a": 1, "d": "medium"},
        {"q": "Quel film de Kubrick se passe dans l'espace ?", "opts": ["Shining", "Orange Mécanique", "2001 l'Odyssée de l'Espace", "Eyes Wide Shut"], "a": 2, "d": "medium"},
        # === HARD (20) ===
        {"q": "Quel film a remporté la Palme d'Or à Cannes en 2019 ?", "opts": ["Portrait de la Jeune Fille en Feu", "Parasite", "Douleur et Gloire", "Atlantique"], "a": 1, "d": "hard"},
        {"q": "Qui a réalisé Mulholland Drive ?", "opts": ["David Fincher", "David Cronenberg", "David Lynch", "David Lean"], "a": 2, "d": "hard"},
        {"q": "Quel film de Tarkovski explore la mémoire et le temps ?", "opts": ["Stalker", "Le Miroir", "Solaris", "Nostalghia"], "a": 1, "d": "hard"},
        {"q": "Combien de films composent le MCU Phase 1 à 3 (Infinity Saga) ?", "opts": ["18", "21", "23", "26"], "a": 2, "d": "hard"},
        {"q": "Quel est le plus long film commercial jamais réalisé (en salle) ?", "opts": ["Ben-Hur", "Guerre et Paix", "Logistics", "Gone with the Wind"], "a": 2, "d": "hard"},
        {"q": "Quel réalisateur a fait le plus de films avec Robert De Niro ?", "opts": ["Coppola", "Scorsese", "Tarantino", "Michael Mann"], "a": 1, "d": "hard"},
        {"q": "Dans quel film Kurosawa apparaît la technique de narration Rashomon ?", "opts": ["Les Sept Samouraïs", "Yojimbo", "Rashomon", "Ikiru"], "a": 2, "d": "hard"},
        {"q": "Quel film d'animation a été le premier entièrement en CGI ?", "opts": ["Shrek", "Toy Story", "A Bug's Life", "Antz"], "a": 1, "d": "hard"},
        {"q": "Quelle technique Hitchcock a-t-il popularisée pour créer le vertige ?", "opts": ["Jump cut", "Dolly zoom", "Match cut", "Tracking shot"], "a": 1, "d": "hard"},
        {"q": "Quel est le McGuffin dans Pulp Fiction ?", "opts": ["Le diamant", "La valise lumineuse", "L'horloge", "Le katana"], "a": 1, "d": "hard"},
        {"q": "Quel compositeur a créé la musique de Blade Runner ?", "opts": ["Hans Zimmer", "Vangelis", "John Williams", "Ennio Morricone"], "a": 1, "d": "hard"},
        {"q": "Quel est le Citizen Kane du cinéma japonais ?", "opts": ["Rashomon", "Tokyo Story", "Seven Samurai", "Les Contes de la lune vague"], "a": 1, "d": "hard"},
        {"q": "Quel film de 1927 est considéré comme le premier film parlant ?", "opts": ["Metropolis", "The Jazz Singer", "Nosferatu", "Sunrise"], "a": 1, "d": "hard"},
        {"q": "Combien de temps dure le plan-séquence d'ouverture de Touch of Evil ?", "opts": ["2 min", "3 min 20", "5 min", "8 min"], "a": 1, "d": "hard"},
        {"q": "Quel mouvement cinématographique est né en France dans les années 60 ?", "opts": ["Néoréalisme", "Expressionnisme", "Nouvelle Vague", "Dogme 95"], "a": 2, "d": "hard"},
        {"q": "Quel réalisateur coréen a fait Oldboy (2003) ?", "opts": ["Bong Joon-ho", "Park Chan-wook", "Kim Jee-woon", "Hong Sang-soo"], "a": 1, "d": "hard"},
        {"q": "Quel est le twist final de The Sixth Sense ?", "opts": ["Le garçon est mort", "Le psychologue est mort", "La mère est un fantôme", "Il rêve"], "a": 1, "d": "hard"},
        {"q": "Quel Oscar a été remporté par Anthony Hopkins pour Le Silence des Agneaux malgré seulement 16 min à l'écran ?", "opts": ["Meilleur second rôle", "Meilleur acteur", "Meilleur réalisateur", "Meilleur scénario"], "a": 1, "d": "hard"},
        {"q": "Quel style visuel caractérise le cinéma de Wes Anderson ?", "opts": ["Plans fixes et symétrie", "Caméra à l'épaule", "Noir et blanc", "Plans larges aériens"], "a": 0, "d": "hard"},
        {"q": "Quel film de Denis Villeneuve a relancé la franchise Dune ?", "opts": ["Dune (2021)", "Arrival", "Blade Runner 2049", "Sicario"], "a": 0, "d": "hard"},
    ],
    "sports_esport": [
        # === EASY (20) ===
        {"q": "Combien de joueurs composent une équipe de football ?", "opts": ["9 (le gardien dort)", "10", "11", "22 (les deux équipes ?)"], "a": 2, "d": "easy", "f": "Le gardien de but est le seul joueur qui peut toucher le ballon avec les mains. Les 10 autres sont jaloux depuis 1863."},
        {"q": "De quelle couleur est un terrain de football ?", "opts": ["Bleu (sur FIFA oui)", "Marron (après la pluie)", "Vert", "Orange (Pays-Bas)"], "a": 2, "d": "easy", "f": "Les lignes blanches du terrain sont redessinées avant chaque match. Le mec qui fait ça est le vrai MVP."},
        {"q": "Quel sport se joue avec une raquette et un volant ?", "opts": ["Tennis", "Squash", "Badminton", "Ping-pong"], "a": 2, "d": "easy", "f": "Le volant de badminton peut atteindre 493 km/h au smash. C'est le projectile le plus rapide de tous les sports de raquette !"},
        {"q": "Combien de joueurs dans une équipe de basketball ?", "opts": ["4", "5", "6", "7"], "a": 1, "d": "easy", "f": "Le basketball a été inventé avec un panier de pêches. Quelqu'un devait monter sur une échelle pour récupérer le ballon après chaque panier !"},
        {"q": "Quel sport utilise un ballon orange ?", "opts": ["Football", "Basketball", "Volleyball", "Handball"], "a": 1, "d": "easy", "f": "Le ballon de basket est orange car cette couleur est la plus visible sur un terrain. Avant, les ballons étaient marron... et invisibles."},
        {"q": "Quel événement sportif a lieu tous les 4 ans ?", "opts": ["Champions League", "Super Bowl", "JO", "Roland-Garros"], "a": 2, "d": "easy", "f": "Les JO antiques comprenaient des épreuves de poésie et de musique. Imagine un rappeur médaillé d'or olympique."},
        {"q": "Dans quel sport marque-t-on des touchdowns ?", "opts": ["Rugby", "Football américain", "Cricket", "Baseball"], "a": 1, "d": "easy", "f": "Un touchdown vaut 6 points, pas 7. Le point bonus vient du 'extra point' après. C'est le DLC du football américain."},
        {"q": "Quel sport se pratique dans une piscine ?", "opts": ["Athlétisme (en glissant)", "Natation", "Escrime sous-marine", "Tir à l'arc sur bouée"], "a": 1, "d": "easy", "f": "Une piscine olympique contient 2,5 millions de litres d'eau. Assez pour prendre 12 500 bains."},
        {"q": "Quelle forme a un ballon de rugby ?", "opts": ["Ronde (c'est du foot ça)", "Ovale", "Carrée (Minecraft)", "En forme de crêpe"], "a": 1, "d": "easy", "f": "Le ballon de rugby était à l'origine fait avec une vessie de porc. Heureusement, la technologie a évolué depuis."},
        {"q": "Quel sport se joue sur de la glace avec un palet ?", "opts": ["Curling (avec le balai)", "Hockey sur glace", "Patinage artistique", "Bobsleigh (non, ça glisse)"], "a": 1, "d": "easy", "f": "Le palet de hockey peut atteindre 170 km/h. C'est pour ça que le gardien ressemble à un Transformers avec tout son équipement."},
        {"q": "Combien de buts pour un 'hat-trick' ?", "opts": ["2 (presque)", "3", "4 (c'est un poker)", "1 (mais très beau)"], "a": 1, "d": "easy", "f": "Le terme 'hat-trick' vient du cricket : on offrait un chapeau au joueur qui réussissait 3 exploits d'affilée. Classe."},
        {"q": "Quel sport Lionel Messi pratique-t-il ?", "opts": ["Tennis", "Basketball", "Football", "Rugby"], "a": 2, "d": "easy", "f": "Messi a marqué 672 buts rien qu'avec le FC Barcelone. Son pied gauche devrait avoir son propre compte en banque."},
        {"q": "Que gagne-t-on au Tour de France ?", "opts": ["Un maillot vert", "Un maillot jaune", "Un maillot rouge", "Un maillot bleu"], "a": 1, "d": "easy", "f": "Le maillot jaune existe depuis 1919. Il est jaune car le journal qui sponsorisait la course était imprimé sur du papier jaune !"},
        {"q": "Quel sport se joue à Wimbledon ?", "opts": ["Golf", "Cricket", "Tennis", "Polo"], "a": 2, "d": "easy", "f": "À Wimbledon, les joueurs doivent porter du blanc. Le dress code est plus strict que dans certains restaurants étoilés."},
        {"q": "Combien de périodes dans un match de hockey sur glace ?", "opts": ["2", "3", "4", "5"], "a": 1, "d": "easy", "f": "La glace d'une patinoire de hockey fait seulement 2,5 cm d'épaisseur. Moins épais que ton téléphone, mais assez solide pour des joueurs de 100 kg."},
        {"q": "Quel sport utilise des gants de boxe ?", "opts": ["Karaté", "Judo", "Boxe", "Lutte"], "a": 2, "d": "easy", "f": "Les gants de boxe ont été rendus obligatoires en 1867. Avant ça, les boxeurs frappaient à mains nues. Aïe."},
        {"q": "Dans quel sport court-on un marathon ?", "opts": ["Cyclisme", "Natation", "Athlétisme", "Triathlon"], "a": 2, "d": "easy", "f": "Le marathon fait 42,195 km car aux JO de 1908, on a rallongé le parcours pour que la reine d'Angleterre puisse voir l'arrivée depuis son balcon."},
        {"q": "Quel jeu vidéo met en scène Mario ?", "opts": ["Zelda", "Super Mario", "Sonic", "Pokémon"], "a": 1, "d": "easy", "f": "Mario s'appelait 'Jumpman' à l'origine et était charpentier, pas plombier. Sa reconversion professionnelle a bien fonctionné."},
        {"q": "Combien de sets pour gagner un match de tennis simple ?", "opts": ["1", "2", "3", "5"], "a": 2, "d": "easy", "f": "Le système de points au tennis (15, 30, 40) viendrait d'une horloge. 60 divisé en 4 = 15, 30, 45... mais 45 c'était trop long à dire, donc 40."},
        {"q": "Quel sport Usain Bolt pratiquait-il ?", "opts": ["Natation", "Cyclisme", "Sprint", "Saut en hauteur"], "a": 2, "d": "easy", "f": "Usain Bolt court le 100m en 9,58 secondes. Dans le même temps, toi tu as à peine eu le temps de décrocher ton téléphone."},
        # === MEDIUM (20) ===
        {"q": "Quel pays a gagné le plus de Coupes du Monde de football ?", "opts": ["Allemagne", "Argentine", "Italie", "Brésil"], "a": 3, "d": "medium"},
        {"q": "Quel jeu esport est développé par Riot Games ?", "opts": ["Dota 2", "Counter-Strike", "League of Legends", "Overwatch"], "a": 2, "d": "medium"},
        {"q": "Quel pays accueillera les JO 2028 ?", "opts": ["Paris", "Los Angeles", "Tokyo", "Brisbane"], "a": 1, "d": "medium"},
        {"q": "Qui détient le record de buts en sélection nationale ?", "opts": ["Messi", "Ronaldo", "Pelé", "Mbappé"], "a": 1, "d": "medium"},
        {"q": "Combien de trous a un parcours standard de golf ?", "opts": ["9", "14", "18", "21"], "a": 2, "d": "medium"},
        {"q": "Quel nageur a gagné 23 médailles d'or olympiques ?", "opts": ["Ian Thorpe", "Michael Phelps", "Ryan Lochte", "Mark Spitz"], "a": 1, "d": "medium"},
        {"q": "Combien dure un match de basketball NBA (temps de jeu) ?", "opts": ["40 min", "48 min", "60 min", "90 min"], "a": 1, "d": "medium"},
        {"q": "Quel est le nom du tournoi majeur de Counter-Strike ?", "opts": ["The International", "Major", "Worlds", "Masters"], "a": 1, "d": "medium"},
        {"q": "Dans quel jeu vidéo combat-on dans un bus volant ?", "opts": ["PUBG", "Apex Legends", "Fortnite", "Warzone"], "a": 2, "d": "medium"},
        {"q": "Quel pays a inventé le basketball ?", "opts": ["France", "Canada", "États-Unis", "Angleterre"], "a": 2, "d": "medium"},
        {"q": "Combien de sets faut-il gagner en finale de Grand Chelem messieurs ?", "opts": ["2", "3", "4", "5"], "a": 1, "d": "medium"},
        {"q": "Quel est le record du monde du 100m hommes (approximatif) ?", "opts": ["9,38s", "9,58s", "9,74s", "9,92s"], "a": 1, "d": "medium"},
        {"q": "Quel club a remporté le plus de Ligues des Champions ?", "opts": ["AC Milan", "Barcelona", "Real Madrid", "Liverpool"], "a": 2, "d": "medium"},
        {"q": "Quel sport pratique Novak Djokovic ?", "opts": ["Badminton", "Tennis", "Ping-pong", "Squash"], "a": 1, "d": "medium"},
        {"q": "Combien de joueurs dans une équipe de rugby à XV ?", "opts": ["13", "15", "16", "18"], "a": 1, "d": "medium"},
        {"q": "Quel jeu esport a 'The International' comme tournoi majeur ?", "opts": ["LoL", "CS2", "Dota 2", "Valorant"], "a": 2, "d": "medium"},
        {"q": "Quel sport a la 'mêlée' et le 'touché' ?", "opts": ["Football", "Rugby", "Hockey", "Basketball"], "a": 1, "d": "medium"},
        {"q": "Quelle équipe NBA a gagné le plus de titres ?", "opts": ["Lakers", "Celtics", "Bulls", "Warriors"], "a": 1, "d": "medium"},
        {"q": "Quel est le format d'un match de League of Legends en compétition ?", "opts": ["3v3", "5v5", "6v6", "4v4"], "a": 1, "d": "medium"},
        {"q": "Quelle distance fait un marathon ?", "opts": ["21,1 km", "42,195 km", "50 km", "100 km"], "a": 1, "d": "medium"},
        # === HARD (20) ===
        {"q": "Quel joueur de tennis a le plus de titres du Grand Chelem (hommes) ?", "opts": ["Federer", "Nadal", "Djokovic", "Sampras"], "a": 2, "d": "hard"},
        {"q": "En quelle année ont eu lieu les premiers Jeux Olympiques modernes ?", "opts": ["1892", "1896", "1900", "1904"], "a": 1, "d": "hard"},
        {"q": "Quel boxeur est resté invaincu avec 50-0 ?", "opts": ["Mike Tyson", "Floyd Mayweather", "Manny Pacquiao", "Sugar Ray Leonard"], "a": 1, "d": "hard"},
        {"q": "Quel pays a organisé la première Coupe du Monde de football ?", "opts": ["Brésil", "France", "Uruguay", "Italie"], "a": 2, "d": "hard"},
        {"q": "Quel est le plus grand stade de football au monde ?", "opts": ["Maracanã", "Wembley", "Rungrado May Day", "Camp Nou"], "a": 2, "d": "hard"},
        {"q": "Quel est le prize pool record de The International (Dota 2) ?", "opts": ["10M$", "25M$", "40M$", "60M$"], "a": 2, "d": "hard"},
        {"q": "Quelle équipe a remporté le premier Worlds de League of Legends ?", "opts": ["T1 (SKT)", "Fnatic", "Samsung Galaxy", "TPA"], "a": 1, "d": "hard"},
        {"q": "Quel est le record de victoires consécutives en NBA ?", "opts": ["27", "33", "42", "50"], "a": 1, "d": "hard"},
        {"q": "En quelle année a été créée la Premier League anglaise ?", "opts": ["1888", "1992", "1996", "2000"], "a": 1, "d": "hard"},
        {"q": "Quel athlète a gagné 8 médailles d'or aux JO de Pékin 2008 ?", "opts": ["Usain Bolt", "Michael Phelps", "Carl Lewis", "Mo Farah"], "a": 1, "d": "hard"},
        {"q": "Quel joueur de CS:GO est surnommé 's1mple' ?", "opts": ["Oleksandr Kostyliev", "Nikola Kovač", "Mathieu Herbaut", "Dev1ce"], "a": 0, "d": "hard"},
        {"q": "Combien de temps dure exactement un round en boxe professionnelle ?", "opts": ["2 minutes", "3 minutes", "4 minutes", "5 minutes"], "a": 1, "d": "hard"},
        {"q": "Quel est le score parfait au bowling ?", "opts": ["200", "250", "300", "350"], "a": 2, "d": "hard"},
        {"q": "Quel pays a le plus de médailles olympiques de tous les temps ?", "opts": ["Chine", "Russie", "États-Unis", "Royaume-Uni"], "a": 2, "d": "hard"},
        {"q": "Quel est le 'Elo' maximum théorique aux échecs ?", "opts": ["2800", "3000", "Pas de maximum", "3500"], "a": 2, "d": "hard"},
        {"q": "Quel surfeur a remporté le plus de titres mondiaux ?", "opts": ["Kelly Slater", "John John Florence", "Gabriel Medina", "Mick Fanning"], "a": 0, "d": "hard"},
        {"q": "Quelle est la vitesse maximale d'un service au tennis (record) ?", "opts": ["220 km/h", "253 km/h", "263 km/h", "280 km/h"], "a": 2, "d": "hard"},
        {"q": "Quel club de football a inventé le 'tiki-taka' ?", "opts": ["Real Madrid", "FC Barcelone", "AC Milan", "Ajax Amsterdam"], "a": 1, "d": "hard"},
        {"q": "Quel est le format des phases finales de Valorant Champions ?", "opts": ["Single elim", "Double elim", "Round robin", "Swiss"], "a": 1, "d": "hard"},
        {"q": "Combien de titres de champion du monde F1 Michael Schumacher a-t-il ?", "opts": ["5", "6", "7", "8"], "a": 2, "d": "hard"},
    ],
    "politics": [
        # === EASY (20) ===
        {"q": "Quelle est la capitale de la France ?", "opts": ["Lyon", "Marseille", "Paris", "Toulouse"], "a": 2, "d": "easy", "f": "Paris s'appelait 'Lutèce' à l'époque romaine. Imagine dire 'je vis à Lutèce'... ça a quand même moins de charme."},
        {"q": "Quel est le drapeau bleu, blanc, rouge ?", "opts": ["Italie", "France", "Pays-Bas", "Luxembourg"], "a": 1, "d": "easy", "f": "Le drapeau français a brièvement été tout blanc sous la monarchie. Le drapeau le plus facile à fabriquer de l'histoire."},
        {"q": "Qui dirige un pays ?", "opts": ["Mon voisin qui sait tout", "Un président ou premier ministre", "Le stagiaire", "L'algorithme de TikTok"], "a": 1, "d": "easy", "f": "Le plus jeune chef d'État élu démocratiquement avait 36 ans. Pendant ce temps, toi à 36 ans tu cherchais encore ta voie."},
        {"q": "Où travaille le Président français ?", "opts": ["Matignon (c'est le PM)", "L'Élysée", "Versailles (trop cher à chauffer)", "Au Starbucks"], "a": 1, "d": "easy", "f": "L'Élysée compte 365 pièces. Une pour chaque jour de l'année, au cas où le Président se perdrait."},
        {"q": "Quel continent contient le plus de pays ?", "opts": ["Asie", "Europe", "Afrique", "Amérique"], "a": 2, "d": "easy", "f": "L'Afrique compte 54 pays reconnus. C'est plus que le nombre de cartes dans un jeu sans les jokers !"},
        {"q": "Combien de couleurs a le drapeau de l'UE ?", "opts": ["1", "2", "3", "4"], "a": 1, "d": "easy", "f": "Le drapeau européen a 12 étoiles, pas une par pays mais parce que 12 est un symbole de perfection. Modeste, l'UE."},
        {"q": "Qu'est-ce qu'un vote ?", "opts": ["Un impôt surprise", "Un choix politique", "Un like en vrai", "Un discours ennuyeux"], "a": 1, "d": "easy", "f": "En Australie, ne pas voter est une infraction passible d'amende. Là-bas, le vote c'est comme les impôts : obligatoire."},
        {"q": "Quel bâtiment accueille l'Assemblée nationale en France ?", "opts": ["Le Sénat", "Le Palais Bourbon", "L'Élysée", "Matignon"], "a": 1, "d": "easy", "f": "Le Palais Bourbon a été construit pour une fille de Louis XIV. De résidence de princesse à salle de débats politiques, sacrée reconversion."},
        {"q": "La devise de la France est Liberté, Égalité, ... ?", "opts": ["Solidarité", "Fraternité", "Justice", "Paix"], "a": 1, "d": "easy", "f": "Cette devise date de la Révolution française en 1789. Elle est inscrite sur tous les bâtiments publics et sur les pièces de monnaie."},
        {"q": "Qui élit le Président de la République en France ?", "opts": ["Le Parlement", "Le Sénat", "Les citoyens", "Le Premier ministre"], "a": 2, "d": "easy", "f": "Le suffrage universel direct en France date de 1962. Avant, c'était un collège électoral qui choisissait. Moins fun."},
        {"q": "Quel est le symbole de la République française ?", "opts": ["L'aigle", "Marianne", "Le coq", "Le lion"], "a": 1, "d": "easy", "f": "Personne ne sait vraiment qui est Marianne. Son visage a été inspiré par des actrices célèbres comme Brigitte Bardot ou Catherine Deneuve."},
        {"q": "Combien de continents y a-t-il ?", "opts": ["5", "6", "7", "8"], "a": 2, "d": "easy", "f": "Certains pays comptent 5, d'autres 6 ou 7 continents. C'est le seul sujet où même les géographes ne sont pas d'accord entre eux."},
        {"q": "Quel est le siège du gouvernement britannique ?", "opts": ["Buckingham Palace", "10 Downing Street", "Westminster Abbey", "Big Ben"], "a": 1, "d": "easy", "f": "Le 10 Downing Street ressemble à une maison normale de l'extérieur. En vrai, c'est relié à plus de 100 pièces derrière la façade."},
        {"q": "Quel océan borde l'Europe à l'ouest ?", "opts": ["Pacifique", "Indien", "Atlantique", "Arctique"], "a": 2, "d": "easy", "f": "L'Atlantique s'élargit de 2,5 cm par an. L'Europe et l'Amérique se séparent lentement... comme un couple en slow motion."},
        {"q": "Quelle est la monnaie de l'Union Européenne ?", "opts": ["Dollar", "Livre", "Euro", "Franc"], "a": 2, "d": "easy", "f": "L'euro est utilisé par 20 pays mais chacun a ses propres dessins au dos des pièces. Collectionner les pièces, c'est comme un Pokédex monétaire."},
        {"q": "Quel pays est le plus grand du monde en superficie ?", "opts": ["Canada", "Chine", "États-Unis", "Russie"], "a": 3, "d": "easy", "f": "La Russie est si grande qu'elle a 11 fuseaux horaires. Quand il est midi à Moscou, il est déjà 21h à l'autre bout du pays."},
        {"q": "Quel jour célèbre-t-on la fête nationale en France ?", "opts": ["1er mai", "8 mai", "14 juillet", "11 novembre"], "a": 2, "d": "easy", "f": "Le 14 juillet commémore la prise de la Bastille en 1789. Ironie : il n'y avait que 7 prisonniers dedans ce jour-là."},
        {"q": "Qui écrit les lois en France ?", "opts": ["Le Président", "Le Parlement", "Les juges", "Les maires"], "a": 1, "d": "easy", "f": "Le Parlement français vote environ 50 à 80 lois par an. Et pourtant, on a toujours l'impression qu'il en manque."},
        {"q": "Quel est le contraire d'une démocratie ?", "opts": ["République (piège classique !)", "Monarchie absolue", "Dictature", "Anarchie organisée"], "a": 2, "d": "easy", "f": "Le mot 'démocratie' vient du grec 'demos' (peuple) et 'kratos' (pouvoir). En gros : c'est toi le boss. En théorie."},
        {"q": "Combien d'étoiles a le drapeau européen ?", "opts": ["10", "12", "15", "27"], "a": 1, "d": "easy", "f": "Les 12 étoiles ne représentent pas les pays membres. Elles symbolisent l'unité et la perfection. Même quand l'UE comptait 6 ou 28 pays, c'était 12 étoiles."},
        # === MEDIUM (20) ===
        {"q": "Combien de pays sont membres de l'Union Européenne (2024) ?", "opts": ["25", "27", "28", "30"], "a": 1, "d": "medium"},
        {"q": "Quel est le siège de l'ONU ?", "opts": ["Genève", "New York", "Bruxelles", "Washington"], "a": 1, "d": "medium"},
        {"q": "Combien de membres permanents siègent au Conseil de sécurité de l'ONU ?", "opts": ["3", "5", "7", "10"], "a": 1, "d": "medium"},
        {"q": "En quelle année a été adoptée la Déclaration universelle des droits de l'homme ?", "opts": ["1945", "1948", "1951", "1960"], "a": 1, "d": "medium"},
        {"q": "Quel pays n'est PAS membre du G7 ?", "opts": ["Italie", "Canada", "Australie", "Japon"], "a": 2, "d": "medium"},
        {"q": "Combien d'années dure un mandat présidentiel en France ?", "opts": ["4 ans", "5 ans", "6 ans", "7 ans"], "a": 1, "d": "medium"},
        {"q": "Quelle ville est le siège de la Cour Internationale de Justice ?", "opts": ["Genève", "Bruxelles", "La Haye", "Strasbourg"], "a": 2, "d": "medium"},
        {"q": "Quel traité a créé l'Union Européenne en 1992 ?", "opts": ["Traité de Rome", "Traité de Maastricht", "Traité de Lisbonne", "Traité de Nice"], "a": 1, "d": "medium"},
        {"q": "Quel est le système politique du Royaume-Uni ?", "opts": ["République", "Monarchie constitutionnelle", "Monarchie absolue", "Théocratie"], "a": 1, "d": "medium"},
        {"q": "Qu'est-ce que l'OTAN ?", "opts": ["Organisation commerciale", "Alliance militaire", "Agence spatiale", "Tribunal international"], "a": 1, "d": "medium"},
        {"q": "En quelle année le mur de Berlin est-il tombé ?", "opts": ["1987", "1989", "1991", "1993"], "a": 1, "d": "medium"},
        {"q": "Quel pays possède le droit de veto au Conseil de sécurité ?", "opts": ["Allemagne", "Inde", "France", "Brésil"], "a": 2, "d": "medium"},
        {"q": "Quel est le parlement de l'Union Européenne ?", "opts": ["Parlement européen", "Sénat européen", "Commission européenne", "Conseil de l'Europe"], "a": 0, "d": "medium"},
        {"q": "Quel pays a le plus grand nombre de fuseaux horaires ?", "opts": ["Russie (grande mais non !)", "États-Unis", "France (DOM-TOM !)", "Royaume-Uni"], "a": 2, "d": "medium"},
        {"q": "Quel est le régime politique de la Chine ?", "opts": ["Démocratie", "Monarchie", "Parti unique communiste", "Théocratie"], "a": 2, "d": "medium"},
        {"q": "Qu'est-ce que le Brexit ?", "opts": ["Entrée du UK dans l'UE", "Sortie du UK de l'UE", "Accord commercial", "Monnaie britannique"], "a": 1, "d": "medium"},
        {"q": "Quel est le nom du parlement allemand ?", "opts": ["Bundestag", "Riksdag", "Cortes", "Duma"], "a": 0, "d": "medium"},
        {"q": "Combien y a-t-il de pays dans le monde (environ) ?", "opts": ["150", "175", "195", "220"], "a": 2, "d": "medium"},
        {"q": "Quel pays n'a pas d'armée ?", "opts": ["Suisse", "Costa Rica", "Luxembourg", "Islande"], "a": 1, "d": "medium"},
        {"q": "Quelle organisation gère le commerce mondial ?", "opts": ["FMI", "OMC", "OMS", "UNESCO"], "a": 1, "d": "medium"},
        # === HARD (20) ===
        {"q": "Qu'est-ce que le gerrymandering ?", "opts": ["Manipulation des districts électoraux", "Type de vote", "Loi fiscale", "Traité international"], "a": 0, "d": "hard"},
        {"q": "Quel est le principe de la séparation des pouvoirs (Montesquieu) ?", "opts": ["Législatif, exécutif, judiciaire", "Roi, église, peuple", "Local, régional, national", "Civil, militaire, religieux"], "a": 0, "d": "hard"},
        {"q": "Quelle doctrine stipule que les USA s'opposent à l'intervention européenne en Amérique ?", "opts": ["Doctrine Truman", "Doctrine Monroe", "Doctrine Eisenhower", "Doctrine Bush"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que le Traité de Westphalie (1648) a établi ?", "opts": ["Les droits de l'homme", "La souveraineté des États-nations", "L'ONU", "Le droit commercial"], "a": 1, "d": "hard"},
        {"q": "Quel est le concept de 'soft power' ?", "opts": ["Force militaire", "Influence culturelle et diplomatique", "Pouvoir économique", "Espionnage"], "a": 1, "d": "hard"},
        {"q": "Combien de pays sont membres de l'ONU ?", "opts": ["186", "193", "198", "203"], "a": 1, "d": "hard"},
        {"q": "Quel est le rôle de la Cour Pénale Internationale ?", "opts": ["Commerce international", "Juger les crimes de guerre et génocides", "Régler les litiges commerciaux", "Gérer les réfugiés"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que le filibuster au Sénat américain ?", "opts": ["Vote secret", "Obstruction parlementaire par discours prolongé", "Amendement constitutionnel", "Procédure de destitution"], "a": 1, "d": "hard"},
        {"q": "Quel accord de 2015 concerne le climat ?", "opts": ["Accord de Kyoto", "Accord de Paris", "Accord de Copenhague", "Accord de Doha"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que le 'Responsibility to Protect' (R2P) ?", "opts": ["Protection des données", "Devoir d'intervention humanitaire", "Protection environnementale", "Défense nationale"], "a": 1, "d": "hard"},
        {"q": "Quel est le concept de Realpolitik ?", "opts": ["Politique idéaliste", "Politique basée sur le pragmatisme et les rapports de force", "Politique écologique", "Politique sociale"], "a": 1, "d": "hard"},
        {"q": "Combien d'amendements a la Constitution américaine ?", "opts": ["10", "20", "27", "33"], "a": 2, "d": "hard"},
        {"q": "Quel est le système de vote utilisé en France pour la présidentielle ?", "opts": ["Scrutin proportionnel", "Scrutin uninominal à 2 tours", "Vote par classement", "Vote par approbation"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que l'habeas corpus ?", "opts": ["Droit de vote", "Protection contre la détention arbitraire", "Liberté de presse", "Droit de propriété"], "a": 1, "d": "hard"},
        {"q": "Quel pays a le plus vieux parlement toujours en activité ?", "opts": ["Royaume-Uni", "Islande", "Grèce", "France"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que le dilemme du prisonnier en théorie des jeux ?", "opts": ["Problème d'évasion", "Situation où la coopération est rationnellement difficile", "Jeu de société", "Problème juridique"], "a": 1, "d": "hard"},
        {"q": "Quel est le concept de 'balance of power' ?", "opts": ["Équilibre budgétaire", "Équilibre des forces entre nations", "Séparation des pouvoirs", "Commerce équitable"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que la doctrine de la dissuasion nucléaire ?", "opts": ["Attaque préventive", "Destruction mutuelle assurée empêchant la guerre", "Désarmement total", "Prolifération contrôlée"], "a": 1, "d": "hard"},
        {"q": "Quel pays a le système politique de démocratie directe le plus développé ?", "opts": ["Suède", "Suisse", "Norvège", "Danemark"], "a": 1, "d": "hard"},
        {"q": "Qu'est-ce que la doctrine Brejnev ?", "opts": ["Libéralisation économique", "Droit d'intervention dans les pays socialistes", "Fin de la guerre froide", "Ouverture à l'Ouest"], "a": 1, "d": "hard"},
    ],
}


# ---------------------------------------------------------------------------
# Category rotation order (cyclic). 6 categories → each appears every 3 weeks.
# ---------------------------------------------------------------------------
CATEGORY_ROTATION = [
    "astronomy",
    "science_health",
    "cinema_series",
    "sports",        # uses "sports_esport" bank
    "esport",        # uses "sports_esport" bank
    "politics",
]

# Map DB slug → question bank key
_BANK_KEY = {
    "sports": "sports_esport",
    "esport": "sports_esport",
}


# ── Utilitaires de dates et rotation ────────────────────────────────────
def _current_week_sunday() -> date:
    """Return the date of the most recent Sunday (or today if Sunday)."""
    today = date.today()
    days_since_sunday = today.weekday() + 1  # Monday=0 → +1=1; Sunday=6 → +1=7
    if days_since_sunday == 7:
        return today
    return today - timedelta(days=days_since_sunday)


def _question_hash(q: dict) -> str:
    """Hash a question to avoid repeats across weeks."""
    return hashlib.md5(q["q"].encode()).hexdigest()


def _get_week_number_since_epoch() -> int:
    """Stable week number for rotation (weeks since 2024-01-07, a Sunday)."""
    epoch = date(2024, 1, 7)
    return (date.today() - epoch).days // 7


def _get_rotation_pair() -> tuple[str, str]:
    """Pick 2 category slugs for this week based on rotation."""
    week_num = _get_week_number_since_epoch()
    n = len(CATEGORY_ROTATION)
    idx1 = (week_num * 2) % n
    idx2 = (week_num * 2 + 1) % n
    return CATEGORY_ROTATION[idx1], CATEGORY_ROTATION[idx2]


def _is_last_friday_of_month(d: date) -> bool:
    """Check if date is the last Friday of its month."""
    if d.weekday() != 4:  # 4 = Friday
        return False
    _, last_day = calendar.monthrange(d.year, d.month)
    return d.day > last_day - 7


def _last_friday_of_month(year: int, month: int) -> date:
    """Get the last Friday of a given month."""
    _, last_day = calendar.monthrange(year, month)
    d = date(year, month, last_day)
    while d.weekday() != 4:
        d -= timedelta(days=1)
    return d


# ── Selection et creation des questions ─────────────────────────────────
async def _get_used_question_hashes(category_id: int | None, db: AsyncSession) -> set[str]:
    """Get hashes of all questions already used for this category (or all for culture G)."""
    query = select(QuizQuestion.question).join(Quiz)
    if category_id is not None:
        query = query.where(Quiz.category_id == category_id)
    result = await db.execute(query)
    used = set()
    for (q_text,) in result.all():
        used.add(hashlib.md5(q_text.encode()).hexdigest())
    return used


def _pick_questions(
    bank: list[dict],
    used_hashes: set[str],
    n_easy: int,
    n_medium: int,
    n_hard: int,
) -> list[dict]:
    """Pick questions from bank, avoiding used ones. Falls back to reuse if needed."""
    easy = [q for q in bank if q["d"] == "easy" and _question_hash(q) not in used_hashes]
    medium = [q for q in bank if q["d"] == "medium" and _question_hash(q) not in used_hashes]
    hard = [q for q in bank if q["d"] == "hard" and _question_hash(q) not in used_hashes]

    if len(easy) < n_easy or len(medium) < n_medium or len(hard) < n_hard:
        easy = [q for q in bank if q["d"] == "easy"]
        medium = [q for q in bank if q["d"] == "medium"]
        hard = [q for q in bank if q["d"] == "hard"]

    picked = (
        random.sample(easy, min(n_easy, len(easy)))
        + random.sample(medium, min(n_medium, len(medium)))
        + random.sample(hard, min(n_hard, len(hard)))
    )
    return picked


async def _create_quiz_from_bank(
    db: AsyncSession,
    category: Category | None,
    bank: list[dict],
    title: str,
    week_start: date,
    quiz_type: str,
    day_of_week: int | None,
    n_easy: int,
    n_medium: int,
    n_hard: int,
) -> bool:
    """Create a single quiz. Returns True if created."""
    total = n_easy + n_medium + n_hard
    if len(bank) < total:
        logger.warning(f"Not enough questions for '{title}' ({len(bank)}/{total})")
        return False

    used_hashes = await _get_used_question_hashes(
        category.id if category else None, db
    )
    picked = _pick_questions(bank, used_hashes, n_easy, n_medium, n_hard)

    if len(picked) < max(total // 2, 5):
        logger.warning(f"Only {len(picked)} questions for '{title}', skipping")
        return False

    quiz = Quiz(
        category_id=category.id if category else None,
        week_start=week_start,
        title=title,
        quiz_type=quiz_type,
        day_of_week=day_of_week,
        question_count=len(picked),
    )
    db.add(quiz)
    await db.flush()

    for i, q in enumerate(picked):
        db.add(QuizQuestion(
            quiz_id=quiz.id,
            question=q["q"],
            options=q["opts"],
            correct_index=q["a"],
            difficulty=q["d"],
            fun_fact=q.get("f"),  # blague/anecdote pour les easy
            sort_order=i,
        ))
    return True


# ── Creation des quiz (appele par le scheduler) ────────────────────────
async def create_weekly_quizzes(db: AsyncSession) -> int:
    """Create 2 weekly quizzes (Monday + Thursday) using category rotation.

    15 questions per quiz: 6 easy + 5 medium + 4 hard.
    Categories rotate through CATEGORY_ROTATION (2 per week).
    Culture G is handled separately by create_monthly_culture_quiz().
    """
    week_start = _current_week_sunday()
    slug_monday, slug_thursday = _get_rotation_pair()

    # Load categories
    result = await db.execute(select(Category))
    categories = {cat.slug: cat for cat in result.scalars().all()}

    created = 0

    # --- Weekly quiz 1 (Monday) ---
    cat1 = categories.get(slug_monday)
    if cat1:
        existing = await db.execute(
            select(Quiz).where(
                Quiz.category_id == cat1.id,
                Quiz.week_start == week_start,
                Quiz.quiz_type == "weekly",
            )
        )
        if not existing.scalar():
            bank_key = _BANK_KEY.get(slug_monday, slug_monday)
            bank = QUESTION_BANK.get(bank_key, [])
            ok = await _create_quiz_from_bank(
                db, cat1, bank,
                title=f"Quiz {cat1.name} – Semaine du {week_start.strftime('%d/%m')}",
                week_start=week_start,
                quiz_type="weekly",
                day_of_week=0,  # Monday
                n_easy=6, n_medium=5, n_hard=4,
            )
            if ok:
                created += 1

    # --- Weekly quiz 2 (Thursday) ---
    cat2 = categories.get(slug_thursday)
    if cat2:
        existing = await db.execute(
            select(Quiz).where(
                Quiz.category_id == cat2.id,
                Quiz.week_start == week_start,
                Quiz.quiz_type == "weekly",
            )
        )
        if not existing.scalar():
            bank_key = _BANK_KEY.get(slug_thursday, slug_thursday)
            bank = QUESTION_BANK.get(bank_key, [])
            ok = await _create_quiz_from_bank(
                db, cat2, bank,
                title=f"Quiz {cat2.name} – Semaine du {week_start.strftime('%d/%m')}",
                week_start=week_start,
                quiz_type="weekly",
                day_of_week=3,  # Thursday
                n_easy=6, n_medium=5, n_hard=4,
            )
            if ok:
                created += 1

    await db.commit()
    logger.info(f"Created {created} quizzes for week of {week_start}")
    return created


async def create_monthly_culture_quiz(db: AsyncSession) -> int:
    """Create culture generale quiz on the last Friday of the month.

    Uses a harder distribution: 4 easy + 6 medium + 5 hard = 15.
    Questions are mixed from ALL categories.
    Returns 1 if created, 0 otherwise.
    """
    today = date.today()

    # Only run on the last Friday of the month
    if not _is_last_friday_of_month(today):
        logger.info("Not the last Friday of the month, skipping culture G quiz")
        return 0

    week_start = _current_week_sunday()

    # Check if already created this month
    existing = await db.execute(
        select(Quiz).where(
            Quiz.quiz_type == "monthly",
            extract("month", Quiz.week_start) == today.month,
            extract("year", Quiz.week_start) == today.year,
        )
    )
    if existing.scalar():
        logger.info("Monthly culture G quiz already exists for this month")
        return 0

    # Build culture G bank: mix from ALL categories
    all_questions: list[dict] = []
    for bank in QUESTION_BANK.values():
        all_questions.extend(bank)

    month_names_fr = [
        "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
    ]
    title = f"Culture Générale – {month_names_fr[today.month]} {today.year}"

    ok = await _create_quiz_from_bank(
        db, None, all_questions,
        title=title,
        week_start=week_start,
        quiz_type="monthly",
        day_of_week=None,
        n_easy=4, n_medium=6, n_hard=5,  # harder distribution for culture G
    )

    if ok:
        await db.commit()
        logger.info(f"Monthly culture G quiz created: '{title}'")
        return 1

    return 0


# ── Lecture des quiz (endpoints API) ────────────────────────────────────
async def get_current_quizzes(db: AsyncSession, user_id: UUID) -> list[QuizSummary]:
    """Get all current-week quizzes with user's play status and winner."""
    week_start = _current_week_sunday()

    result = await db.execute(
        select(Quiz)
        .options(joinedload(Quiz.category))
        .where(Quiz.week_start == week_start)
        .order_by(Quiz.day_of_week.nullslast(), Quiz.id)
    )
    quizzes = result.scalars().unique().all()

    summaries = []
    for quiz in quizzes:
        attempt = await db.execute(
            select(QuizAttempt).where(
                QuizAttempt.quiz_id == quiz.id,
                QuizAttempt.user_id == user_id,
            )
        )
        already = attempt.scalar() is not None
        winner_data = await _get_quiz_winner(quiz.id, db)

        summaries.append(QuizSummary(
            quiz_id=quiz.id,
            category_slug=quiz.category.slug if quiz.category else None,
            category_name=quiz.category.name if quiz.category else "Culture Générale",
            title=quiz.title,
            week_start=quiz.week_start,
            quiz_type=quiz.quiz_type,
            question_count=quiz.question_count,
            day_of_week=quiz.day_of_week,
            already_played=already,
            winner=winner_data,
        ))

    return summaries


async def get_quiz_detail(quiz_id: int, user_id: UUID, db: AsyncSession) -> QuizOut | None:
    """Get full quiz with questions (no correct answers revealed)."""
    result = await db.execute(
        select(Quiz)
        .options(joinedload(Quiz.category), joinedload(Quiz.questions))
        .where(Quiz.id == quiz_id)
    )
    quiz = result.scalars().unique().first()
    if not quiz:
        return None

    attempt_result = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.quiz_id == quiz.id,
            QuizAttempt.user_id == user_id,
        )
    )
    attempt = attempt_result.scalar()
    questions = sorted(quiz.questions, key=lambda q: q.sort_order)

    return QuizOut(
        id=quiz.id,
        category_slug=quiz.category.slug if quiz.category else None,
        category_name=quiz.category.name if quiz.category else "Culture Générale",
        title=quiz.title,
        week_start=quiz.week_start,
        quiz_type=quiz.quiz_type,
        question_count=quiz.question_count,
        questions=[
            QuestionOut(
                id=q.id,
                question=q.question,
                options=q.options,
                difficulty=q.difficulty,
                fun_fact=q.fun_fact,
                sort_order=q.sort_order,
            )
            for q in questions
        ],
        already_played=attempt is not None,
        user_score=attempt.score if attempt else None,
    )


# ── Soumission et scoring ──────────────────────────────────────────────
async def submit_quiz(
    quiz_id: int,
    user_id: UUID,
    answers: list[int],
    db: AsyncSession,
    duration_seconds: int | None = None,
) -> QuizResultOut | None:
    """Score a quiz attempt. Returns None if already played or quiz not found."""
    result = await db.execute(
        select(Quiz).options(joinedload(Quiz.questions)).where(Quiz.id == quiz_id)
    )
    quiz = result.scalars().unique().first()
    if not quiz:
        return None

    existing = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.user_id == user_id,
        )
    )
    if existing.scalar():
        return None

    questions = sorted(quiz.questions, key=lambda q: q.sort_order)

    score = 0
    correct_indices = []
    for i, q in enumerate(questions):
        correct_indices.append(q.correct_index)
        if i < len(answers) and answers[i] == q.correct_index:
            score += 1

    attempt = QuizAttempt(
        user_id=user_id,
        quiz_id=quiz_id,
        score=score,
        total=len(questions),
        duration_seconds=duration_seconds,
    )
    db.add(attempt)
    await db.commit()

    return QuizResultOut(
        score=score,
        total=len(questions),
        correct_indices=correct_indices,
        duration_seconds=duration_seconds,
    )


# ── Classement (leaderboard) ────────────────────────────────────────────
async def get_leaderboard(
    db: AsyncSession,
    quiz_id: int | None = None,
    period: str = "weekly",
    limit: int = 10,
) -> LeaderboardOut:
    """Get leaderboard for a specific quiz or aggregated for the period."""
    if quiz_id:
        # Leaderboard for a single quiz
        result = await db.execute(
            select(QuizAttempt)
            .options(joinedload(QuizAttempt.user))
            .where(QuizAttempt.quiz_id == quiz_id)
            .order_by(
                QuizAttempt.score.desc(),
                QuizAttempt.duration_seconds.asc().nullslast(),
                QuizAttempt.completed_at.asc(),
            )
            .limit(limit)
        )
        attempts = result.scalars().unique().all()
        entries = [
            LeaderboardEntry(
                rank=i + 1,
                display_name=a.user.display_name or "Anonyme",
                score=a.score,
                total=a.total,
                duration_seconds=a.duration_seconds,
            )
            for i, a in enumerate(attempts)
        ]
        return LeaderboardOut(quiz_id=quiz_id, period=period, entries=entries)

    # Aggregated monthly leaderboard: sum scores for all quizzes this month
    today = date.today()
    month_start = today.replace(day=1)
    next_month = (today.replace(day=28) + timedelta(days=4)).replace(day=1)

    result = await db.execute(
        select(
            QuizAttempt.user_id,
            func.sum(QuizAttempt.score).label("total_score"),
            func.sum(QuizAttempt.total).label("total_questions"),
            func.count(QuizAttempt.id).label("quizzes_played"),
        )
        .join(Quiz)
        .where(Quiz.week_start >= month_start, Quiz.week_start < next_month)
        .group_by(QuizAttempt.user_id)
        .order_by(func.sum(QuizAttempt.score).desc())
        .limit(limit)
    )
    rows = result.all()

    # Load user names
    entries = []
    for i, row in enumerate(rows):
        user_result = await db.execute(
            select(User).where(User.id == row.user_id)
        )
        user = user_result.scalar()
        entries.append(LeaderboardEntry(
            rank=i + 1,
            display_name=user.display_name if user and user.display_name else "Anonyme",
            score=int(row.total_score),
            total=int(row.total_questions),
        ))

    return LeaderboardOut(period="monthly", entries=entries)


async def _get_quiz_winner(quiz_id: int, db: AsyncSession) -> WinnerOut | None:
    """Get the top scorer for a quiz (ties broken by speed then time)."""
    result = await db.execute(
        select(QuizAttempt)
        .options(joinedload(QuizAttempt.user))
        .where(QuizAttempt.quiz_id == quiz_id)
        .order_by(
            QuizAttempt.score.desc(),
            QuizAttempt.duration_seconds.asc().nullslast(),
            QuizAttempt.completed_at.asc(),
        )
        .limit(1)
    )
    attempt = result.scalars().first()
    if not attempt:
        return None

    return WinnerOut(
        display_name=attempt.user.display_name or "Anonyme",
        score=attempt.score,
        total=attempt.total,
        duration_seconds=attempt.duration_seconds,
    )
