# DevGlobe — VS Code Extension

Apparaissez sur un globe 3D en temps reel pendant que vous codez. Votre activite s'affiche en direct sur [devglobe.xyz](https://devglobe.xyz) — les autres developpeurs vous voient, decouvrent vos projets et vos liens.

## Fonctionnement

1. Connectez-vous sur [devglobe.xyz](https://devglobe.xyz) avec GitHub
2. Copiez votre cle API depuis les parametres
3. Ouvrez la sidebar DevGlobe dans VS Code et collez la cle
4. Vous apparaissez sur le globe

L'extension envoie un **heartbeat toutes les 30 secondes** tant que vous codez. Elle se met en pause apres 1 minute d'inactivite. Apres 10 minutes sans activite, vous disparaissez du globe.

## Fonctionnalites

- **Heartbeat en direct** — votre presence sur le globe en temps reel
- **Detection de langage** — 48+ langages detectes automatiquement
- **Integration Git** — detecte votre repo et compte les insertions/suppressions sur 24h
- **Message de statut** — dites aux autres sur quoi vous travaillez
- **Partage du repo** — vous decidez si le nom de votre repo est visible (desactive par defaut)
- **Barre de statut** — votre temps de code du jour affiche en direct (ex. `2h 15m`)
- **Reprise hors-ligne** — reprend automatiquement au retour de la connexion

## Ce que DevGlobe vous apporte

- **Visibilite** — votre GitHub, votre X, vos projets et vos liens accessibles a tous les devs sur le globe
- **Reseau** — decouvrez qui code en ce moment, dans quel langage, et retrouvez leurs liens
- **Motivation** — classement hebdomadaire par temps de code + streak de jours consecutifs
- **Vitrine projets** — mettez en avant jusqu'a 10 projets, les plus actifs apparaissent dans un carousel sur le site

## Vie privee

Cette extension est **open source** — vous pouvez auditer chaque ligne de code sur [GitHub](https://github.com/Nako0/devglobe-extension).

**Ce qui est envoye :**
- Langage actif (ex. "TypeScript")
- Position approximative (~11 km de precision, jamais votre adresse)
- Temps de code (par jour, par langage)
- Nom du repo — **uniquement si vous l'activez** (desactive par defaut)
- Stats de commits (insertions/suppressions sur 24h, aucun contenu de code)

**Ce qui n'est jamais envoye :**
- Votre code source
- Le contenu de vos fichiers
- Les noms de vos fichiers
- Vos frappes clavier
- Vos messages de commit
- Votre adresse IP (utilisee pour la geolocalisation puis jetee)

Votre cle API est stockee dans le **trousseau systeme de votre OS** (macOS Keychain, Windows Credential Manager, Linux libsecret) — jamais en texte brut.

## Commandes

| Commande | Description |
|----------|-------------|
| `DevGlobe: Set Status Message` | Definir votre statut depuis la Palette de commandes |

## Parametres

| Parametre | Defaut | Description |
|-----------|--------|-------------|
| `devglobe.trackingEnabled` | `true` | Activer/desactiver le tracking |
| `devglobe.shareRepo` | `false` | Rendre le nom de votre repo visible sur le globe |
| `devglobe.statusMessage` | `""` | Votre message de statut (max 100 caracteres) |

## Liens

- [devglobe.xyz](https://devglobe.xyz) — le globe
- [Code source](https://github.com/Nako0/devglobe-extension) — repo GitHub public
