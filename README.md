<h1 align="center">DevGlobe — Extensions IDE</h1>

<p align="center">
  <strong>Apparaissez sur un globe 3D en temps reel pendant que vous codez.</strong><br/>
  Extensions officielles pour <a href="https://devglobe.xyz">devglobe.xyz</a>
</p>

<p align="center">
  <a href="#-vs-code">VS Code</a> &nbsp;·&nbsp;
  <a href="#-jetbrains">JetBrains</a> &nbsp;·&nbsp;
  <a href="#-vie-privee--securite">Vie privee</a> &nbsp;·&nbsp;
  <a href="#-comment-ca-marche-techniquement">Technique</a>
</p>

---

> **Open source & transparent** — Ces extensions sont 100% open source. Aucun code n'est lu, aucune donnee sensible n'est collectee. Vous pouvez auditer chaque ligne de ce depot. On explique en detail tout ce qui est envoye (et ce qui ne l'est pas) dans la section [Vie privee & Securite](#vie-privee--securite).

---

## Pourquoi DevGlobe ?

DevGlobe est une plateforme gratuite et open source qui affiche les developpeurs actifs sur un globe 3D interactif. Quand vous codez, un marqueur s'allume a votre position sur la carte. Les autres developpeurs vous voient en direct.

**Ce que ca vous apporte :**

- **De la visibilite** — Votre profil GitHub, votre compte X, vos projets et vos liens sont accessibles a tous les developpeurs presents sur le globe. C'est une vitrine pour ce que vous construisez. Les noms de vos repos ne sont visibles que si vous le decidez.

- **Du reseau** — Vous voyez qui code en ce moment et dans quel langage. Cliquez sur un marqueur pour decouvrir un developpeur, ses projets, ses liens sociaux. C'est un moyen simple de rencontrer des gens qui partagent vos technos.

- **De la motivation** — Un classement hebdomadaire classe tous les developpeurs par temps de code. Votre streak (jours consecutifs de code) est visible sur votre profil. C'est un petit moteur de motivation au quotidien.

- **Une vitrine pour vos projets** — Vous pouvez mettre en avant jusqu'a 10 projets sur le globe. Les projets les plus actifs (temps de code + activite Git) sont affiches dans un carousel visible par tous les visiteurs du site. Si vous avez une startup, vous pouvez lier vos donnees [TrustMRR](https://trustmrr.com) pour afficher votre MRR, votre croissance et vos metriques publiquement.

---

## Le globe en bref

Sur [devglobe.xyz](https://devglobe.xyz), vous trouvez :

- **Un globe 3D** avec les developpeurs actifs en temps reel (marqueurs colores ou avatars GitHub)
- **Des profils cliquables** — langage actif, temps de session, bio, stack technique, liens sociaux (GitHub, X, Reddit), et repo si le developpeur a choisi de le partager
- **Un classement hebdomadaire** — top developpeurs par temps de code, mis a jour en direct
- **Un carousel de projets en vedette** — les projets les plus actifs, classes par un score : `0.5 × temps de code sur le repo + (insertions − suppressions)` sur les dernières 24 heures
- **Un fil d'activite** — qui vient de se connecter, qui est parti
- **Une recherche** — trouvez un developpeur par nom ou pseudo GitHub
- **Des stats detaillees** — temps du jour, streak, repartition des langages sur 30 jours, activite par repo sur 24h (si le developpeur a choisi de partager son activité git)

**Suppression de compte** — Si vous supprimez votre compte, toutes vos donnees sont effacees. Aucune information n'est conservee.

---

## Comment ca marche

```
┌──────────────┐    heartbeat (30s)    ┌──────────────┐    temps reel    ┌──────────────┐
│  Votre IDE    │ ───────────────────► │     BDD       │ ──────────────► │  Globe 3D     │
│  (extension)  │  lang, position, repo │  (PostgreSQL) │                 │  devglobe.xyz │
└──────────────┘                       └──────────────┘                  └──────────────┘
```

1. **Connectez-vous** sur [devglobe.xyz](https://devglobe.xyz) avec GitHub
2. **Copiez votre cle API** depuis les parametres du site
3. **Installez l'extension** dans VS Code ou votre IDE JetBrains
4. **Collez la cle** dans la sidebar de l'extension
5. **Vous etes en ligne** — votre marqueur apparait sur le globe

L'extension envoie un **heartbeat toutes les 30 secondes** tant que vous codez activement. Si vous arretez de taper pendant plus d'1 minute, les heartbeats se mettent en pause automatiquement. **Apres 10 minutes sans activite, vous disparaissez du globe** et etes considere comme inactif. 

---

## VS Code

### Installation

1. Installez depuis le [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=devglobe.devglobe)
2. Ouvrez la sidebar **DevGlobe** (icone globe dans la barre d'activite)
3. Collez votre cle API → **Connect**

### Fonctionnalites

| Fonctionnalite | Description |
|-----------------|-------------|
| **Heartbeat en direct** | Envoie votre activite toutes les 30s. Pause automatique apres 1 min d'inactivite. |
| **Detection de langage** | Detecte 48+ langages depuis votre onglet editeur actif. |
| **Integration Git** | Detecte votre repo depuis le remote git. Compte les insertions/suppressions sur 24h a chaque nouveau commit. |
| **Message de statut** | Ecrivez ce sur quoi vous travaillez — visible sur votre profil globe. |
| **Partage du repo** | **Vous decidez.** Le nom de votre repo n'est jamais affiche sauf si vous activez explicitement ce toggle (desactive par defaut). |
| **Reprise hors-ligne** | Detecte la perte de connexion et reprend automatiquement au retour du reseau. |
| **Barre de statut** | Affiche votre temps de code du jour (ex. `2h 15m`) dans la barre VS Code. |

### Sidebar

Deux vues dans le panneau lateral :

- **Connexion** — champ de cle API (masque) + lien pour obtenir votre cle sur devglobe.xyz
- **Tableau de bord** — temps de code en direct, langage actif, message de statut, toggle partage repo, boutons demarrer/arreter, deconnexion

### Commande

`DevGlobe: Set Status Message` — accessible depuis la Palette de commandes (`Ctrl+Shift+P` / `Cmd+Shift+P`)

### Prerequis

- VS Code **1.80+**
- **Zero dependance externe** — utilise uniquement les APIs natives VS Code et Node.js

---

## JetBrains

Compatible avec **tous les IDEs JetBrains** : IntelliJ IDEA, WebStorm, PyCharm, GoLand, Rider, PhpStorm, CLion, RubyMine, DataGrip, Android Studio.

### Installation

1. Installez depuis le [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/devglobe) ou telechargez le `.zip` depuis les [Releases](https://github.com/devglobe/devglobe-extensions/releases)
2. Si installation manuelle : **Settings → Plugins → ⚙️ → Install Plugin from Disk**
3. Ouvrez la fenetre **DevGlobe** (sidebar droite)
4. Collez votre cle API → **Connect**

### Fonctionnalites

Memes fonctionnalites que l'extension VS Code, adaptees a la plateforme JetBrains :

| Fonctionnalite | Description |
|-----------------|-------------|
| **Heartbeat en direct** | Intervalle de 30s, pause apres 1 min d'inactivite. |
| **Detection de langage** | Utilise le systeme natif FileType de JetBrains — supporte tous les langages de votre IDE sans configuration. |
| **Integration Git** | Meme detection de repo + stats de commits. |
| **Message de statut** | Editable depuis le panneau lateral, persiste dans les parametres IDE. |
| **Partage du repo** | Meme toggle que VS Code — votre repo reste invisible sauf activation explicite. |
| **Reprise hors-ligne** | Detection automatique + reprise au retour du reseau. |
| **Barre de statut** | Affiche `⏱ 2h 15m` dans la barre de statut de l'IDE. |
| **Notifications** | Notifications natives de l'IDE pour chaque action (connexion, tracking, statut, erreurs). |

### Compatibilite

- **Builds IDE** : 233 — 253.* (2023.3 a 2025.3)
- **Java** : 17+

---

## Vie privee & Securite

On sait que quand on installe une extension, on fait confiance au developpeur. On prend ca au serieux. Voici exactement ce que fait l'extension — pas de zone grise.

### Ce que l'extension envoie

| Donnee | Envoyee | Detail |
|--------|---------|--------|
| Langage de programmation | Oui | Le nom du langage de votre onglet actif (ex. "TypeScript"). Rien d'autre. |
| Position approximative | Oui | Ville + coordonnees **arrondies a ~11 km**. Vous apparaissez comme une zone sur le globe, pas une adresse. |
| Nom du repo | **Vous decidez** | Format `owner/repo` uniquement. **Le partage est desactive par defaut.** Personne ne voit votre repo sauf si vous activez explicitement le toggle "Partager le repo". |
| Stats de commits | Oui | Nombre d'insertions et de suppressions sur 24h. Envoye une seule fois par nouveau commit detecte. |
| Temps de code | Oui | Accumule par jour, par langage. |
| Message de statut | Oui | Uniquement ce que vous ecrivez vous-meme. |

### Ce que l'extension n'envoie PAS

| Donnee | Envoyee |
|--------|---------|
| Votre code source | **Jamais** |
| Le contenu de vos fichiers | **Jamais** |
| Les noms de vos fichiers | **Jamais** |
| Les chemins de vos dossiers | **Jamais** |
| Vos frappes clavier | **Jamais** |
| Vos messages de commit | **Jamais** |
| Vos branches Git | **Jamais** |
| Votre adresse IP | **Jamais stockee** — utilisee uniquement pour determiner la ville via un service de geolocalisation, puis jetee, l'IP reste sur votre IDE|
| Vos variables d'environnement | **Jamais** |
| Vos cles SSH ou credentials | **Jamais** |

### Localisation : comment ca marche exactement

L'extension determine votre ville a partir de votre adresse IP via un service de geolocalisation externe (freeipapi.com, avec fallback sur ipapi.co). Les deux sont des services publics gratuits, sans cle API.

**Les coordonnees sont volontairement degradees :**
- Arrondies a 1 decimale, soit **environ 11 km de precision**
- Exemple : `48.8566, 2.3522` (adresse precise) → `48.9, 2.4` (zone large)
- Resultat : vous apparaissez dans une region sur le globe, pas a votre adresse

La position est **mise en cache pendant 1 heure** — l'extension ne rappelle pas le service de geolocalisation a chaque heartbeat.

**Votre adresse IP n'est jamais transmise a DevGlobe.** Elle est utilisee uniquement par le service de geolocalisation tiers pour determiner votre ville, puis elle est jetee.

### Stockage de la cle API

Votre cle API DevGlobe n'est **jamais stockee en texte brut**.

| IDE | Methode de stockage |
|-----|---------------------|
| VS Code | **SecretStorage** — trousseau systeme de votre OS (macOS Keychain, Windows Credential Manager, Linux libsecret) |
| JetBrains | **PasswordSafe** — gestionnaire de credentials natif de l'IDE, adosse au trousseau OS |

L'extension VS Code migre automatiquement les anciennes cles qui etaient en clair dans `settings.json` vers le trousseau securise.

### Securite reseau

- **HTTPS uniquement** (TLS 1.2+) — aucun fallback HTTP
- Les heartbeats vont directement vers la base de donnees — aucun serveur intermediaire
- Le panneau lateral VS Code utilise une **Content Security Policy** avec un nonce cryptographique pour empecher l'injection de scripts
- Cote serveur, des politiques de securite au niveau des lignes (Row Level Security) isolent les donnees de chaque utilisateur

### Code ouvert

Les deux extensions sont open source. Vous pouvez lire chaque ligne de code qui tourne sur votre machine. C'est le but de ce depot.

---

## Comment ca marche techniquement

### Le heartbeat

Toutes les 30 secondes, si vous avez tape du code dans la derniere minute, l'extension envoie un heartbeat a la base de donnees. Ce heartbeat contient :

```
{
  cle_api,                    // votre identifiant (stocke dans le trousseau OS)
  heure,                      // 0-23
  latitude, longitude,        // arrondis a 1 decimale (~11 km)
  ville,                      // "Paris, France"
  langage,                    // "TypeScript"
  repo,                       // "owner/repo" (envoyé au backend mais l'affichage sur le globe est conditionné selon vos préférences, l'envoi au backend sert pour le calcul du score attribué au projet featured)
  partage_repo,               // true/false
  insertions, suppressions    // stats git 24h (sur nouveau commit uniquement)
}
```

Le serveur repond avec le temps de code total du jour. L'extension met a jour l'affichage dans la sidebar et la barre de statut.

### Detection du langage

- **VS Code** : lit le `languageId` de l'editeur actif, puis le traduit via une table de 48+ langages (JavaScript, TypeScript, Python, Rust, Go, Kotlin, etc.)
- **JetBrains** : utilise le systeme natif `FileType` de l'IDE — aucune table manuelle, supporte automatiquement tous les langages que votre IDE supporte

### Integration Git

L'extension execute `git remote get-url origin` dans le dossier de votre fichier actif et extrait l'identifiant `owner/repo` depuis l'URL (SSH ou HTTPS). Le resultat est mis en cache 5 minutes.

Quand un nouveau commit est detecte (via `git rev-parse HEAD`), l'extension compte les insertions et suppressions des dernieres 24h via `git log --shortstat`. **Aucun contenu de code, message de commit ou nom de fichier n'est lu.**

### Detection hors-ligne

Apres 2 echecs reseau consecutifs, l'extension passe en mode hors-ligne et vous notifie. Des que la connexion revient, elle reprend automatiquement les heartbeats.

### Architecture

```
vscode-extension/
├── src/
│   ├── extension.ts      # Cycle de vie, gestion cle API (SecretStorage)
│   ├── tracker.ts        # Machine d'etat, boucle heartbeat, detection hors-ligne
│   ├── heartbeat.ts      # Appels HTTP vers la BDD
│   ├── sidebar.ts        # Panneau lateral (webview HTML/CSS/JS)
│   ├── geo.ts            # Geolocalisation IP (double fournisseur + fallback)
│   ├── git.ts            # Detection repo + stats commits
│   ├── language.ts       # Traduction languageId → nom affiche
│   ├── logger.ts         # Logs debug/info/warn/error
│   └── constants.ts      # URLs, timeouts, intervalles
└── package.json

jetbrains-plugin/
├── src/main/kotlin/xyz/devglobe/plugin/
│   ├── core/
│   │   ├── DevGlobeTracker.kt    # Tracker singleton, scheduler heartbeat
│   │   ├── HeartbeatService.kt   # Client HTTP
│   │   ├── GeoService.kt         # Geolocalisation IP (meme logique)
│   │   ├── GitService.kt         # Detection repo + stats commits
│   │   ├── LanguageService.kt    # Detection langage via FileType natif
│   │   ├── TrackerState.kt       # Etat immutable
│   │   └── Constants.kt          # URLs, timeouts, intervalles
│   ├── auth/
│   │   └── ApiKeyStorage.kt      # Wrapper PasswordSafe (trousseau OS)
│   ├── settings/
│   │   └── DevGlobeSettings.kt   # Persistance des parametres IDE
│   ├── ui/
│   │   ├── SidebarPanel.kt       # Panneau Swing (login + dashboard)
│   │   ├── SidebarFactory.kt     # Integration fenetre d'outil
│   │   └── DevGlobeStatusBarFactory.kt
│   └── DevGlobeStartupActivity.kt
├── src/main/resources/META-INF/
│   └── plugin.xml
└── build.gradle.kts
```

---

## Compiler depuis les sources

### VS Code

```bash
cd vscode-extension
npm install
npm run compile
```

Tester : `F5` dans VS Code pour lancer un Extension Development Host.

Packager : `npx @vscode/vsce package`

### JetBrains

```bash
cd jetbrains-plugin
./gradlew buildPlugin
```

Le `.zip` sera dans `build/distributions/`.

Tester : `./gradlew runIde` ou **Run → Run Plugin** dans IntelliJ.

---

## Contribuer

Les contributions sont les bienvenues — corrections, nouvelles fonctionnalites, documentation.

1. Forkez le depot
2. Creez votre branche (`git checkout -b fix/something`)
3. Committez vos changements
4. Ouvrez une Pull Request

---

## Licence

MIT — voir [LICENSE](LICENSE).

---

<p align="center">
  <a href="https://devglobe.xyz">devglobe.xyz</a>
</p>
