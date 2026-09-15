# Oils of Africa Stock — Web

Frontend de l'application de gestion de stock (flexitanks & heating pads).
Next.js 16 (App Router, TypeScript, Tailwind v4). Direction visuelle
Glassmorphism / Liquid Glass, premium, mobile-first.

Dossier de conception : voir l'artefact « Stock Oils of Africa ».
Backend : `../oils-stock-api` (Django REST, `http://127.0.0.1:8000` en dev).

## Installation

```bash
npm install
cp .env.local.example .env.local   # adapter NEXT_PUBLIC_API_URL si besoin
npm run dev
```

→ http://localhost:3000 — redirige vers `/login` si non connecté.

Le backend (`oils-stock-api`) doit tourner en parallèle (`.venv/Scripts/python.exe manage.py runserver`), avec `CORS_ALLOWED_ORIGINS` incluant `http://localhost:3000` (déjà le cas par défaut).

## Direction visuelle

- **Glassmorphism** : panneaux translucides (`bg-glass`/`bg-glass-strong`) + `backdrop-blur-xl` + bordure fine lumineuse (`border-glass-border`) + ombre douce — voir `components/ui/glass-card.tsx`.
- **Couleurs** (`app/globals.css`) : base blanc/gris très clair (`--background`, `--surface`), accent **bleu professionnel** (`--accent` / `--accent-2` cyan clair), sémantique **vert** (`--ok`, disponible/actif), **orange** (`--warn`, alerte), **rouge** (`--crit`, sortie/erreur).
- **Typographie** : Geist Sans (texte courant) + Geist Mono (libellés/majuscules — captions, badges de rôle, en-têtes de tableau) pour une vraie hiérarchie.
- **Fond décoratif** (`.oa-app-bg`) : halos radiaux bleu/cyan très doux, fixes derrière le contenu — donne au verre quelque chose à laisser transparaître.
- **Animations** : `.oa-rise` (apparition douce des cartes), transitions sur nav/tiroir mobile, tout neutralisé sous `prefers-reduced-motion`. Le rideau animé de l'écran de connexion (`.oa-*` dans `globals.css`) est antérieur et n'a pas été touché.
- **Mode sombre** : système (`prefers-color-scheme`) par défaut, bascule manuelle clair/sombre/système persistée (bouton lune/soleil/écran dans l'en-tête desktop et le tiroir mobile). Voir « Thème clair/sombre » ci-dessous.

## Structure

```
src/
  app/
    layout.tsx           racine : polices, AuthProvider
    login/page.tsx        page de connexion (animation rideau, non retouchée ici)
    scan/page.tsx          écran caméra plein écran (Jalon 5) — HORS du groupe (app),
                            pas de sidebar/bottom-nav (même famille que login/) ; garde
                            d'auth répliquée localement ; ?sortie=<id> = mode "ajout à
                            la sortie en cours", sinon résolution pure (statut affiché)
    (app)/                groupe de routes authentifiées, enveloppées par AppShell
      page.tsx             tableau de bord — KPIs, répartition par type, stock par
                            fournisseur : DONNÉES RÉELLES (API) ; section "Mouvements
                            de stock" clairement marquée "Jalon 2" (pas de faux zéros)
      stock/                liste réelle (recherche, filtres type/statut)
      fournisseurs/          liste (recherche/lien vers la fiche) + nouveau/ (création, admin) +
                              [id]/ (fiche éditable, stats réelles, profil d'extraction)
      clients/                liste (lien vers la fiche) + nouveau/ (création, magasinier/admin) +
                              [id]/ (fiche éditable, stats réelles — sorties par statut)
      sorties/               liste (filtres client/statut, deep-link ?statut=... depuis le
                              tableau de bord) + nouvelle/ (en-tête) + [id]/ (lignes, valider,
                              annuler, bon de sortie PDF)
      retours/                formulaire d'enregistrement (lignes répétables, réservé
                              magasinier/admin)
      receptions/             liste (filtres nature/statut/fournisseur) + nouvelle/ (saisie
                              manuelle OU arrivage PDF, multipart) + reprise/ (réservé admin)
                              + [id]/ (PDF + extraction en deux volets pour un arrivage, lignes
                              à l'unité ou par plage, doublons, validation, annulation)
      parametres/              EmptyState (pas de contenu encore — Jalon 6)
  components/
    app-shell.tsx          compose header desktop + header/tiroir mobile + bottom nav
    desktop-header.tsx      nav horizontale, icônes, état actif glass+bleu, profil, cloche
    mobile-header.tsx       barre mobile (logo + hamburger)
    mobile-drawer.tsx       tiroir plein écran (tous les liens + déconnexion)
    bottom-nav.tsx          barre mobile 4 sections (Dashboard/Stock/Opérations/Plus)
    nav-items.ts            source unique des liens de navigation (icônes lucide-react)
    toast.tsx               notification éphémère (bienvenue/déconnexion), style glass
    serial-search.tsx        <SerialSearch> — suggestions de numéro de série en direct,
                              rendues via portail (voir section dédiée plus bas)
    ui/
      glass-card.tsx, badge.tsx, button.tsx, skeleton.tsx, kpi-card.tsx,
      donut-chart.tsx, bar-list.tsx, empty-state.tsx   — design system réutilisable
  lib/
    api.ts                client HTTP (login, refresh, logout, /auth/me/) — API_V1 = API_URL + /api/v1
    auth-context.tsx      AuthProvider/useAuth — session, token, authFetch()
    utils.ts               cn() (clsx)
```

## Thème clair/sombre

Toutes les couleurs sont des variables CSS (`app/globals.css`, `:root`) mappées vers Tailwind via `@theme inline` — aucun composant ne code une couleur en dur (hors `text-white` sur les boutons/fonds pleins, valable dans les deux thèmes). Trois façons de piloter le thème :

1. **Système** (par défaut) : `@media (prefers-color-scheme: dark)` redéfinit les tokens, sans aucune action de l'utilisateur.
2. **Bascule manuelle** : le bouton thème (`components/theme-toggle.tsx`, présent dans `desktop-header.tsx` et `mobile-drawer.tsx`) fait défiler *système → clair → sombre → système* et pose `data-theme="light|dark"` sur `<html>`, qui l'emporte sur la préférence système dans les deux sens. Persisté dans `localStorage` (`lib/theme.ts`, clé `oils-stock-theme`).
3. **Anti-flash** : un script inline (`next/script`, `strategy="beforeInteractive"`, dans `app/layout.tsx`) relit cette même clé et pose `data-theme` **avant** l'hydratation React, pour qu'un utilisateur ayant choisi le sombre ne voie jamais un flash clair au chargement. Ce script duplique volontairement la clé de stockage (il ne peut pas importer `lib/theme.ts`, il s'exécute avant tout le JS applicatif) — les deux doivent rester synchronisés si la clé change un jour.

Ajouter une nouvelle couleur : la définir dans les trois blocs de `globals.css` (`:root`, `@media (prefers-color-scheme: dark)`, `:root[data-theme="dark"]`), puis la mapper dans `@theme inline`. Ne jamais utiliser `black`/`white` en dur pour un survol ou une superposition légère — utiliser `text-foreground`/`bg-foreground` avec une opacité (ex. `hover:bg-foreground/[0.04]`), qui vaut noir-sur-clair et blanc-sur-sombre automatiquement.

## Authentification

- Le token JWT (access + refresh) est stocké dans `localStorage`, rafraîchi automatiquement par `authFetch()` sur un 401.
- `logout()` révoque le refresh token côté serveur (`POST /auth/logout/`, liste noire) en best-effort, puis efface toujours la session locale même si l'appel échoue (backend injoignable, jeton déjà expiré...).
- La protection des routes `(app)/*` est **côté client** (redirection si pas de session) — suffisant pour cette étape ; à durcir plus tard (cookies + Proxy) si besoin d'une vraie protection serveur.
- `/parametres` n'est listé dans la navigation que pour le rôle `ADMIN`, mais la page elle-même n'est pas encore gardée côté route (elle ne contient aucune donnée sensible pour l'instant).

## Tableau de bord — ce qui est réel vs. à venir

Aucun chiffre n'est inventé. Les KPIs (unités en stock, répartition flexitank/heating
pad, fournisseurs/clients actifs, stock par fournisseur) viennent d'appels réels à
`/api/v1/unites/`, `/api/v1/fournisseurs/`, `/api/v1/clients/` (lecture du champ
`count` d'une requête filtrée — exact quelle que soit la pagination). Le panneau
« Mouvements de stock » (réceptions/sorties en attente et validées, retours enregistrés
— cinq liens cliquables vers `/receptions`, `/sorties`, `/retours`) et « Activité
récente » (derniers `MouvementStock`, badge coloré par type — rouge = sortie, vert =
entrée/retour, comme documenté dans la palette sémantique ci-dessus, référence de
sortie ou de réception selon le type) sont réels depuis le Jalon 3.

Ces requêtes de comptage se font **séquentiellement**, pas en parallèle : plusieurs
rafraîchissements de jeton concurrents avec le même refresh token se marcheraient
dessus côté API (rotation + liste noire, voir `oils-stock-api`).

## Scan mobile & HTTPS local (Jalon 5)

L'écran `/scan` utilise `getUserMedia` (caméra), qui exige un **contexte sécurisé** —
automatique sur `localhost`/`127.0.0.1`, mais pas dès qu'on y accède depuis un
téléphone via l'adresse IP de la machine sur le réseau local. Sans HTTPS, la page
reste utilisable (bouton caméra désactivé, message explicite) via la **saisie
manuelle**, qui appelle `/api/v1/unites/lookup/` exactement comme la résolution
d'une photo appelle `/api/v1/unites/scanner/`.

Pour activer la caméra depuis un téléphone du réseau :

1. **Frontend** — `next dev --experimental-https -H <ip-lan-de-la-machine>` (ex.
   `192.168.1.23`, trouvable via `ipconfig`). Le flag `-H` est nécessaire : sans lui,
   le certificat auto-signé ne couvre que `localhost`/`127.0.0.1`/`::1`, pas l'IP du
   réseau local que le téléphone va réellement utiliser. Next.js télécharge et lance
   `mkcert` tout seul (rien à installer à part), génère `certificates/localhost.pem`
   + `localhost-key.pem` (ajoutés à `.gitignore` automatiquement, réutilisés tel quel
   au prochain lancement tant que l'hôte ne change pas) et sert déjà sur `0.0.0.0`
   (hostname par défaut de `next dev` — pas besoin d'un flag séparé pour le LAN).
2. **Backend** — servir aussi l'API en HTTPS avec le **même certificat**, sinon le
   navigateur bloque les appels vers `http://...:8000` depuis une page `https://...`
   (*mixed content*). Voir `oils-stock-api/README.md` (`runserver_plus --cert-file
   ... --key-file ...`, pointant vers les fichiers générés à l'étape 1).
3. Adapter `NEXT_PUBLIC_API_URL` (`.env.local`) vers `https://<ip-lan>:8000`.
4. Sur le téléphone, ouvrir `https://<ip-lan>:3000/scan` : le navigateur affiche un
   avertissement « connexion non privée » (certificat auto-signé, non approuvé par
   le téléphone) — **accepter une fois suffit** : une fois l'interstitiel passé, la
   page reste servie en HTTPS et `window.isSecureContext` vaut `true`, la caméra
   fonctionne. Pas besoin d'installer le certificat racine mkcert sur le téléphone.

**Ne pas confondre** avec le tunnel zrok déjà présent dans `.env.local`
(`NEXT_PUBLIC_API_URL`) — celui-ci sert à un usage différent (accès distant hors
réseau local) et est géré par l'utilisateur ; les étapes ci-dessus concernent l'accès
**HTTPS en réseau local**, pour la caméra spécifiquement.

### Accès distant via zrok (deux tunnels)

Pour ouvrir l'appli depuis un téléphone hors réseau local (tester le web push
notamment), il faut **deux tunnels** :

1. Backend : `zrok share public http://localhost:8000` → coller l'URL obtenue dans
   `oils-stock-web/.env.local` (`NEXT_PUBLIC_API_URL=https://<sous-domaine>.share.zrok.io`)
   puis relancer `next dev`.
2. Frontend : `zrok share public http://localhost:3000` → ouvrir **cette** URL sur le
   téléphone.

Côté API, aucune config à retoucher à chaque redémarrage : `ALLOWED_HOSTS` contient
le joker `.share.zrok.io`, et `CORS_ALLOWED_ORIGIN_REGEXES` / `CSRF_TRUSTED_ORIGINS`
(dans `core/settings.py`) autorisent toute origine `*.share.zrok.io`. Seul le
`NEXT_PUBLIC_API_URL` du frontend doit être mis à jour quand le sous-domaine du
tunnel **backend** change.

## Fournisseurs & clients — fiches complètes

Le backend supportait déjà le CRUD complet (`fournisseurs` : lecture tous, écriture
admin ; `clients` : lecture tous, écriture magasinier+admin) — seul le frontend
manquait la création/l'édition/le détail, qui n'affichait qu'une liste en lecture.

- **Création** (`/fournisseurs/nouveau`, `/clients/nouveau`) — formulaire dédié,
  garde côté route qui redirige si le rôle n'a pas le droit d'écrire (même
  permission que le backend, donc jamais un formulaire affiché puis refusé à
  l'envoi).
- **Fiche détail** (`/fournisseurs/[id]`, `/clients/[id]`) — informations générales
  en lecture, bouton **Modifier** (rôle autorisé seulement) qui bascule les mêmes
  champs en édition inline, `PATCH` à l'enregistrement. Le profil d'extraction
  (Jalon 4) a déménagé de l'accordéon de la liste vers cette fiche.
- **Petites stats, toujours réelles** (`getCount`, même pattern que le tableau de
  bord — requêtes séquentielles, jamais `Promise.all`, voir la note dans
  `(app)/page.tsx`) :
  - Fournisseur : unités en stock, unités sorties, **Flexitanks, Heating pads**
    (répartition par type, demandée après coup), réceptions (total), réceptions validées.
  - Client : sorties au total, en brouillon, validées.
  - Une erreur sur les stats n'empêche jamais de voir/modifier la fiche — elles
    restent simplement à `—` (skeleton) si le calcul échoue.
- **Dernières transactions** (fiche fournisseur, demandé après coup) — les 5
  mouvements de stock les plus récents impliquant une unité de ce fournisseur
  (`GET /mouvements/?unite_stock__fournisseur=&ordering=-date_mouvement`,
  nouveau filtre côté API — voir README backend), même style que
  « Activité récente » du tableau de bord (badge coloré par type de mouvement).
- Liste : chaque ligne devient un lien vers la fiche (l'ancien accordéon
  "profil d'extraction only" de `/fournisseurs` a été retiré, plus nécessaire
  maintenant que la fiche existe).
- **Répartition Flexitank/Heating pad aussi sur la liste `/fournisseurs`**
  (demandé après coup, une fois la fiche détail livrée — l'utilisateur voulait
  l'aperçu sans devoir ouvrir chaque fiche) — colonne "Répartition" sur la vue
  liste (`<table>`), même icônes `Container`/`Thermometer` sur la vue cartes,
  juste au-dessus du badge de profil d'extraction. Vient de deux nouveaux
  champs annotés côté API (`nb_flexitanks`/`nb_heating_pads`, voir README
  backend) — plus aucun appel réseau supplémentaire, ils arrivent déjà dans
  la réponse `GET /fournisseurs/`.
- **Seuil de réapprovisionnement par type, par fournisseur** (demandé après
  coup, tour suivant) — deux champs numériques optionnels
  (`seuil_reappro_flexitank`/`seuil_reappro_heating_pad`) sur
  `/fournisseurs/nouveau` et en édition sur `/fournisseurs/{id}` (vide = pas
  d'alerte). Une fois configuré : sur la fiche détail, les cartes KPI
  Flexitank/Heating pad passent au ton rouge avec l'indice « ⚠ Sous le seuil
  (N) » quand le stock l'atteint, sinon « Seuil : N » ; sur la liste, l'icône
  `Container`/`Thermometer` de la colonne "Répartition" devient un triangle
  d'alerte rouge. `nb_flexitanks`/`nb_heating_pads` représentent maintenant le
  stock **actuel** (pas le total historique) côté API — a permis de
  simplifier la fiche détail au passage : les deux appels séparés
  `/unites/?fournisseur=&type_article=` ont été retirés, les cartes lisent
  directement les champs déjà présents dans la réponse `GET /fournisseurs/{id}/`.

**Bug backend réel trouvé en testant** (pas un souci frontend) : supprimer un
fournisseur/client puis en recréer un avec le **même code** faisait planter la
création en 500 (`IntegrityError`) — `code` est unique au niveau base sur
*toutes* les lignes (supprimées incluses, suppression logique), mais la
vérification d'unicité ne regardait que les lignes actives. Corrigé côté API
(`FournisseurRepository.get_by_code`/`ClientRepository.get_by_code` interrogent
maintenant `all_objects`) — un code déjà pris, même par une ligne supprimée,
renvoie proprement un 400 au lieu d'un 500. Deux tests de régression ajoutés
(voir README backend).

**Vérifié en vrai** : création fournisseur (admin) → fiche → modification d'un
champ → stats à jour ; création client (magasinier) → fiche → stats à jour ;
`lecteur1` ne voit aucun bouton d'ajout/modification nulle part ; `magasinier1`
redirigé hors de `/fournisseurs/nouveau` (admin seulement) mais peut créer un
client. Répartition par type et 5 dernières transactions vérifiées avec de
vraies données (fournisseur DHL : 3 flexitanks, 5 heating pads, transactions
réelles listées avec leur référence de réception). `tsc`/`eslint`/`next build`
propres, 0 erreur console. Répartition par type sur la liste `/fournisseurs`
vérifiée ensuite en session navigateur réelle (`admin`/`admin1234`), vues
liste **et** cartes, chiffres affichés identiques à une lecture directe en
shell Django sur le même queryset annoté (⚠ les valeurs notées à l'époque —
« DHL 1/20 » etc. — étaient fausses : bug soft-delete découvert et corrigé
plus tard, voir « Tableau de bord analytique » ci-dessous ; vrai : DHL 1
flexitank / 3 heating pads). Seuil de réappro vérifié en posant
temporairement `seuil_reappro_flexitank=2` sur DHL via l'API réelle (stock
Flexitank réel de DHL = 1, donc sous le seuil) : alerte rouge confirmée sur
la liste (triangle à la place de l'icône Flexitank) et sur la fiche détail
(carte KPI rouge, « ⚠ Sous le seuil (2) »), Heating pad resté au vert avec
son seuil non déclenché (« Seuil : 3 ») sur la même fiche — seuils remis à
`null` juste après pour ne pas laisser de donnée de test sur un vrai
fournisseur.

## Tableau de bord analytique (demandé après coup)

Grosse demande transverse : stock dormant, seuil de réapprovisionnement
dynamique, sorties mensuelles, prévisions de commande. Planifiée en plan mode ;
tout le calcul vit côté backend dans la nouvelle app `apps/dashboard` (voir
README backend), le frontend ne fait qu'afficher.

- **Deux composants graphiques maison** (aucune lib de charts, SVG inline comme
  `donut-chart`/`bar-list`) : `src/components/ui/line-chart.tsx`
  (`LineChart` multi-séries — un `null` dans une série crée un trou dans le
  tracé, pas une chute à zéro ; sert aux sorties mensuelles + leur moyenne
  mobile 3 mois en pointillé) et `src/components/ui/threshold-bar-list.tsx`
  (`ThresholdBarList` — barre remplie jusqu'au stock actuel, rouge si sous le
  seuil, + repère vertical à la position du seuil sur la même piste).
- **5 champs ajoutés au formulaire fournisseur** (`/fournisseurs/nouveau` et
  édition `/fournisseurs/{id}`, exact même sous-bloc `border-t pt-4` que les
  seuils manuels) : `delai_livraison_jours`, `stock_securite_flexitank`/
  `_heating_pad`, `cout_unitaire_flexitank`/`_heating_pad` (les coûts en
  `step=0.01`, envoyés en chaîne pour ne pas perdre les décimales).
- **`/stock-dormant`** — `PageHeader` avec un champ `seuil_jours` (défaut 90)
  dans le slot d'actions, 2 `KpiCard` (nb unités, valeur immobilisée totale —
  note si des unités n'ont pas de coût configuré), table diagnostique (pas de
  bascule liste/cartes). `valeur_immobilisee` = « — » si non configurée,
  jamais un chiffre inventé.
- **`/previsions`** — `ThresholdBarList` en tête (seulement les entrées avec un
  seuil), puis la liste priorisée du backend (déjà triée par urgence) : badge
  `Manuel`/`Calculé` sur le seuil, badge rouge « À commander » si `en_alerte`.
- **Dashboard** — nouveau bloc `LineChart` (sorties mensuelles), nouveau donut
  « stock actuel par fournisseur » (palette cyclique, distinct du donut par
  type), `ThresholdBarList` compact avec lien « Voir tout » → `/previsions`.
  **Boucle N+1 supprimée** au passage : le donut/barlist par fournisseur
  lisaient un `getCount` par fournisseur, ils lisent maintenant
  `nb_flexitanks + nb_heating_pads` déjà annotés sur chaque ligne de
  `GET /fournisseurs/`.
- **Entrées de nav** : « Stock dormant » (`Clock`) et « Prévisions »
  (`TrendingUp`) après « Stock » dans `src/components/nav-items.ts`.

**Bug backend réel trouvé en vérifiant le dashboard** : les 3 totaux
(donut par type, barlist fournisseur, donut fournisseur) ne se réconciliaient
pas (155 vs 172). Cause : `FournisseurRepository.get_all()` comptait les
`UniteStock` **supprimées logiquement** (relation inverse via le manager de
base, sans filtre soft-delete) — un fournisseur affichait 20 heating pads au
lieu de 3. Corrigé côté API (`unites_stock__deleted_at__isnull=True` dans le
filtre) ; la note plus haut « DHL 1/20 » était donc fausse (vrai : 1 flexitank
/ 3 heating pads). Après correction, les 3 totaux tombent tous sur 155.

**Vérifié en vrai** (`admin`/`admin1234`, session navigateur) : dashboard
complet chargé, `LineChart` avec le pic de septembre + moyennes mobiles en
pointillé, les 3 donuts/barlists réconciliés à 155 ; `/stock-dormant` (0 unité
à 90 j, 157 à 1 j, validation `seuil_jours` non numérique/négatif → 400) ;
`/previsions` avec vraies données et le bon ordre de tri ; `valeur_immobilisee`
confirmée `null` sans coût et « 9.75 » après en avoir posé un temporairement
sur DHL (puis remis à `null`). `tsc`/`eslint`/`next build` propres, 0 erreur
console.

## Notifications web push + in-app (demandé après coup)

Alerte active à chaque validation de sortie / réception, à chaque franchissement
de seuil de réappro, et à chaque passage de stock à zéro. Toute la logique
(destinataires, détection de franchissement, envoi push) vit côté backend dans
`apps/notifications` (voir README backend) ; le frontend affiche et s'abonne.

- **Service worker `public/sw.js`** (statique, push uniquement — pas de cache,
  pas de mode hors-ligne) : gère `push` (`showNotification`) et
  `notificationclick` (focus la fenêtre ouverte sur le bon chemin, sinon
  `openWindow`). `public/manifest.webmanifest` + `icon-192/512.png` (générées
  depuis le logo) + `metadata.manifest` dans `app/layout.tsx`.
- **`src/lib/push.ts`** — `pushDisponible()` (`serviceWorker` + `PushManager` +
  `window.isSecureContext`, comme la caméra du scan), `activerPush(authFetch)`
  (enregistre le SW **sans `navigator.serviceWorker.ready`** — indispo en
  worker / automatisation headless : on attend `statechange → activated` à la
  place —, demande la permission, récupère la clé VAPID via l'API, s'abonne,
  POST `/notifications/abonnements/`), `desactiverPush`.
- **`src/lib/notifications-context.tsx`** — `NotificationProvider` (monté
  autour de `AppShell` dans `(app)/layout.tsx`, no-op si non authentifié) +
  `useNotifications()`. Sondage `GET /notifications/non-lus/` toutes les 50 s +
  au retour de focus / `visibilitychange` ; si le compteur monte → recharge la
  liste + toast du dernier non lu. Fetch **séquentiel** (jamais `Promise.all` —
  même raison que le dashboard). Rend son propre `<Toast>` (celui d'`auth-context`
  n'expose pas `setFlash`).
- **`src/components/notification-bell.tsx`** — cloche + badge rouge non-lus
  (« 9+ » au-delà), dropdown glass (capteur plein écran pour le clic dehors) :
  8 dernières notifs (icône par type, titre, corps, temps relatif, bord gauche
  accent si non lu), « Tout marquer comme lu », « Voir toutes les
  notifications », affordance activer/désactiver le push selon `pushEtat`.
  Remplace le placeholder statique de `desktop-header.tsx` ; ajoutée aussi à
  `mobile-header.tsx`.
- **`/notifications`** — page complète (`PageHeader`, carte d'état push, liste),
  + entrée de nav (`Bell`).

**Vérifié en vrai** (`admin`/`admin1234`) : validation d'une sortie via l'API
→ au retour de focus, le badge passe à 1, un toast « Sortie SOR-… validée »
apparaît, le dropdown liste la notif ; une sortie qui vide NEWCO / Heating pad
(1 → 0) déclenche en plus un toast **« Stock épuisé — NEWCO · Heating pad »**
et la page `/notifications` liste les deux ; « Tout marquer comme lu » vide le
badge. 0 erreur console. `tsc`/`eslint`/`next build` propres. **Non vérifiable
en headless** : le `pushManager.subscribe()` réel — `Notification.requestPermission()`
renvoie « denied » en Chrome headless quoi qu'on fasse. Vérifié à la place :
le SW s'enregistre et atteint `activated`, et `pywebpush` accepte la clé VAPID
et joint FCM (410 sur un endpoint bidon). La bannière OS reste à confirmer une
fois dans un vrai navigateur.

## PWA + responsive mobile — « le socle » (Phase 1)

Application installable (manifest complet + service worker étendu à la main,
sans Serwist/next-pwa), consultable hors connexion en lecture, et responsive
sur les pages qui ne l'étaient pas encore. L'écriture hors-ligne (file de
synchro, idempotence backend) est la Phase 2, voir section dédiée plus bas.

- **`public/manifest.webmanifest`** — `id`, `display_override`, icônes `any` +
  `maskable` (`icon-maskable-{192,512}.png`, générées depuis le logo, zone de
  sécurité ~20 %), `shortcuts` (Nouvelle sortie/réception, Scan). `src/app/apple-icon.png`
  (180×180 opaque, convention de fichier Next → `<link rel="apple-touch-icon">` auto).
  `app/layout.tsx` : export `viewport` (`themeColor` clair/sombre, `viewportFit:"cover"`)
  + `metadata.appleWebApp`. Pas de splash iOS générée (repli sur le flash uni
  `background_color` — écran généré par Android automatiquement).
- **`src/lib/sw-register.ts`** — singleton d'enregistrement du SW (`/sw.js?v=…&api=…`,
  la query fige la version et l'origine API dans l'URL du script) partagé par
  `PwaProvider` et `push.ts` (un seul `register`, plus de doublon).
- **`public/sw.js`** étendu à la main (toujours push + cache maintenant) :
  `fetch` route les GET `/api/v1/*` en network-first + repli cache (503
  synthétique `{offline:true}` si rien en cache), les assets `_next/static` en
  cache-first, les navigations documents (`request.mode==="navigate"`) en
  network-first + repli sur la route déjà visitée puis `/offline`. **Piège
  corrigé** : une requête RSC de navigation client (même URL que la page, ex.
  `/stock?_rsc=…`) ne doit **jamais** être mise en cache sous la même clé qu'une
  vraie navigation document — sinon un rechargement hors-ligne sert le flux RSC
  brut au lieu du HTML. Les écritures (POST/PATCH/DELETE) ne sont jamais
  interceptées (Phase 2). `CACHE_VERSION` à incrémenter avec `SW_VERSION`
  (`sw-register.ts`) à chaque changement de logique.
- **`src/lib/auth-context.tsx`** durci pour la lecture hors-ligne — la
  hydratation ne déconnecte plus jamais sur une panne réseau (`estErreurReseau()`
  dans `lib/api.ts`, base sur `TypeError`) : elle reprend la session sur le
  profil mis en cache (`localStorage["oils-stock-user"]`), et ne purge les
  jetons que sur un vrai refus serveur (401/403). Un cache API est vidé
  (`postMessage CLEAR_API_CACHE`) au login/logout pour ne jamais montrer les
  données d'un autre utilisateur.
- **`src/lib/connectivity-context.tsx`** — sonde `GET /api/health/` (non
  versionnée, laissée passer telle quelle par le SW) toutes les 25 s + sur
  l'évènement `online`, anti-clignotement (2 échecs pour basculer hors-ligne,
  1 succès pour revenir). `<ConnectivityDot>` (pastille verte/rouge/orange
  discrète dans les deux en-têtes) + `<ConnectivityBanner>` (bandeau sous
  l'en-tête, flash vert « Connexion rétablie » 3 s).
- **`src/lib/pwa-context.tsx`** — capture `beforeinstallprompt`/`appinstalled`,
  détection iOS, flux de mise à jour du SW (bannière « Nouvelle version » →
  `SKIP_WAITING` → reload).
- **Bottom-sheets** (`src/components/ui/bottom-sheet.tsx`, glisser pour fermer,
  retour Android via `useOverlayHistory`) : `pwa-install-sheet.tsx` (Chromium
  `beforeinstallprompt` / instructions iOS Partager → écran d'accueil / repli
  générique) et `notif-activation-sheet.tsx`, orchestrées par `pwa-sheets.tsx`
  (jamais les deux ensemble ; installation proposée après 25 s ou dès la 2ᵉ
  session, notifications juste après ; mémoire de refus 7 j dans `localStorage`).
- **`src/lib/use-overlay-history.ts`** — sentinelle d'historique pour que le
  bouton retour Android (ou le geste retour iOS) ferme un overlay (tiroir,
  modale, sheet, popover) au lieu de quitter l'écran. Câblé sur `Modal`,
  `MobileDrawer`, le popover d'opérations de `BottomNav`, la cloche.
- **Responsive** — `stock-dormant`, `previsions` et `parametres` avaient un
  tableau large sans repli mobile : ajout de `useViewMode` + vue cartes (et
  pour `parametres`, la vue cartes reste éditable : rôle, actif/inactif,
  suppression). Cibles tactiles ≥ 44 px partout (`@media (pointer: coarse)`
  dans `globals.css` + `BUTTON_BASE`). Safe-areas (encoche/barre gestuelle) sur
  `BottomNav`, `MobileDrawer`, `Modal`, `<main>`. `receptions/[id]` : le PDF en
  `<iframe>` devient un bouton « Ouvrir le PDF » sous `lg` (l'iframe ne rentre
  pas sur mobile). **Bug trouvé et corrigé** : le tiroir mobile fermé
  (`translate-x-full`, `position: fixed`) rendait la page défilable
  horizontalement de ~30 à 200 px dans Chromium malgré `overflow-hidden` sur
  son conteneur — un `fixed` transformé hors-écran contribue quand même au
  `scrollWidth` du document. Fix : `overflow-x: hidden` sur `<html>` (le
  « root scroller » réel, pas seulement `body`) dans `globals.css`.
- **`src/components/ui/status-pill.tsx`**, **`list-states.tsx`** (`ListError`
  avec bouton Réessayer, `StaleNote`) — vocabulaire d'états partagé ; câblés
  sur les listes (`stock`, `sorties`, `receptions`, `clients`, `fournisseurs`,
  `stock-dormant`, `previsions`) avec un `reloadKey` pour rejouer le
  chargement, et un message dédié sur 503 (repli hors-ligne du SW).

**Vérifié en vrai** (`next build && next start`, session `browser-automation`,
`admin`/`admin1234`) : SW `activated` dès le premier chargement ; rechargement
hors-ligne d'une route déjà visitée → contenu réel depuis le cache ; démarrage
« à froid » hors-ligne sur `/` → coquille + données en cache, **pas** de
déconnexion ; route jamais visitée hors-ligne → page `/offline` ; aucune des 8
pages de liste ne déborde horizontalement à 360 px ; bandeau hors-ligne
apparaît/disparaît avec la sonde ; tiroir mobile fermé par le bouton retour
(back du navigateur) sans quitter la page ; sheets d'installation et de
notification s'enchaînent sans se chevaucher et respectent le « Plus tard »
(mémoire `localStorage`). `tsc`/`eslint`/`next build` propres. **Non vérifiable
en headless** : l'invite native `beforeinstallprompt` (jamais déclenchée par
Chromium headless) et l'octroi réel de la permission de notification —
mêmes limites que documentées pour le web push.

## Écriture hors-ligne + synchronisation (Phase 2)

Suite de la Phase 1 (lecture hors-ligne seule) : les écritures « brouillon »
peuvent désormais être mises en file localement quand l'appareil est hors
connexion, puis rejouées automatiquement au retour du réseau. Périmètre
verrouillé avec l'utilisateur avant implémentation : réception `SAISIE`
uniquement (l'`ARRIVAGE`, avec son upload PDF, et la `REPRISE` restent en
ligne seul) ; aucune résolution d'identifiant local→serveur (l'ajout de
ligne/l'édition sur un parent créé hors-ligne restent indisponibles tant que
sa création n'a pas synchronisé) ; `valider`/`annuler`/retours restent
strictement en ligne (opérations qui changent l'état réel du stock).

- **`src/lib/offline-db.ts`** (nouveau, première utilisation d'IndexedDB du
  projet — coexiste avec le Cache Storage du service worker) — base Dexie
  `oils-stock-offline`, table `operations` (`OperationEnAttente` : type,
  ressource, `parentId` pour une ligne/édition, `corps`, `apercu` pour
  l'affichage, `statut`, `erreurType` "reseau" vs "serveur"). L'UUID généré à
  l'enfilage sert à la fois de clé primaire Dexie et de valeur de l'en-tête
  `Idempotency-Key` envoyée au moment du rejeu.
- **`src/lib/sync-engine.ts`** (nouveau) — `drainer()` vide la file de façon
  strictement séquentielle (jamais `Promise.all` sur `authFetch`, même
  convention que le refresh de jeton) ; un échec réseau interrompt le
  drainage (repris à la reconnexion), un échec serveur (400/403/404) marque
  seulement cette opération en erreur et continue sur les suivantes.
  `enfiler()` (appelée par les pages), `relancerEchecsReseau()` (filet de
  sécurité 30 s, ne retente que les échecs réseau — jamais les échecs
  serveur, pour ne pas boucler à chaud sur un rejet permanent).
  `src/lib/use-sync-engine.ts` déclenche `drainer()` sur l'évènement
  `oa:reconnecte` déjà existant (Phase 1) et au montage si déjà en ligne.
- **`src/lib/connectivity-context.tsx`** étendu — `operationsEnAttente`/
  `synchronisation` via `useLiveQuery` (réactif, pas de polling manuel),
  reflétés sur `<ConnectivityDot>` (badge numérique) et `<ConnectivityBanner>`
  (« — N modification(s) en attente d'envoi », flash « synchronisation en
  cours » au retour de connexion).
- **`src/components/pending-creations.tsx`** (nouveau) — créations en attente
  fusionnées au-dessus des listes réelles (`sorties`, `receptions`, `clients`,
  `fournisseurs`) ; pas de route détail pour une création sans ID serveur, un
  clic ouvre un aperçu en lecture seule avec relance/suppression sur échec.
- **Les 4 pages de création** — branchent sur `useConnectivity().enLigne`,
  mettent en file plutôt que de poster directement quand hors-ligne.
- **`sorties/[id]`, `receptions/[id]`** — fusion `lignesAffichees` (lignes
  serveur + opérations locales en attente pour ce parent) ; **retirer une
  ligne encore en file (jamais envoyée) est un dequeue 100 % local, sans
  aucun appel réseau** — seule une ligne déjà confirmée déclenche un vrai
  `DELETE`. `genererPlage()` (réception) suit le même schéma, rendu en un
  seul bandeau récapitulatif plutôt qu'une ligne par unité (la numérotation
  exacte est calculée côté serveur).
- **`clients/[id]`, `fournisseurs/[id]`** — `enregistrer()` optimiste hors
  ligne (mise à jour immédiate de l'affichage + pastille « Modification en
  attente »), recharge la vraie fiche dès l'évènement `oa:operation-synchronisee`.

**Bug réel trouvé et corrigé en testant en vrai** : les 4 pages de création
redirigeaient vers `router.push("/liste?en_attente=<id>")` après mise en
file — paramètre lu par **aucune** page (mort dès l'origine), et une
navigation client-side vers une URL jamais visitée dans la session Next.js
exige un aller-retour réseau pour le RSC de la page cible, qui **échoue
systématiquement hors-ligne** (le service worker de la Phase 1 ne met jamais
en cache les requêtes RSC, par choix). La page restait bloquée sur
« Chargement… » indéfiniment alors même que l'opération avait bien été mise
en file sans perte de données. **Corrigé** : plus de redirection automatique
hors-ligne — confirmation inline sur la page elle-même (« Sortie mise en
attente. » + lien normal vers la liste, cliqué au moment choisi par
l'utilisateur, jamais déclenché automatiquement).

**Vérifié en vrai, bout en bout** (`browser-automation`, session persistante,
`admin`/`admin1234`, `http://localhost:3000`) : création de sortie hors-ligne
→ 0 requête `POST` pendant la coupure → ligne IndexedDB `en_attente` correcte
→ confirmation inline affichée → retour en ligne → file drainée
automatiquement (`statut: "synchronise"`) → vraie sortie visible dans la
liste. Édition client hors-ligne : 0 `PATCH` pendant la coupure, mise à jour
optimiste + pastille affichées, sync automatique confirmée au retour réseau
(valeur réelle relue depuis le serveur après coup). Ajout de ligne sur une
réception déjà synchronisée hors-ligne : 0 `POST`, ligne fusionnée dans le
tableau ; retrait de cette même ligne avant sa synchronisation confirmé comme
un dequeue purement local (0 requête `DELETE`) ; une seconde ligne ajoutée
resynchronisée avec succès au retour réseau. `tsc`/`eslint`/`next build`
propres sur l'ensemble du projet.

## Recherche de numéro de série en direct

`src/components/serial-search.tsx` (`<SerialSearch>`) — remplace le simple
`<input>` numéro de série sur `/receptions/[id]` (ajout à l'unité),
`/sorties/[id]` (ajout à l'unité) et `/retours` (lignes répétables) : dès 2
caractères tapés (300 ms de debounce), interroge `GET /unites/?search=` et
affiche jusqu'à 6 correspondances sous le champ — icône par type (`Container`
= Flexitank, `Thermometer` = Heating pad, mêmes icônes que le tableau de
bord), fournisseur, badge de statut (En stock/Sorti). Cliquer une suggestion
remplit le champ et, selon la page, ajuste automatiquement le type d'article
(réception) ou le fournisseur de désambiguïsation (sortie/retour) — sans
jamais empêcher de taper un numéro qui n'existe pas encore (création normale).

**Bug réel trouvé et corrigé en testant** : la liste rendue en
`position: absolute` dans le flux normal se retrouvait **visuellement sous**
le tableau de la page sur `/sorties/[id]` (invisible-cliquable seulement en
forçant le clic dans les tests, donc pas cliquable du tout pour un vrai
utilisateur). Cause : `GlassCard` utilise `backdrop-blur`, qui crée un
nouveau contexte d'empilement CSS — un `z-index` posé à l'intérieur ne peut
jamais dépasser une carte sœur suivante, aussi élevé soit-il. **Corrigé** en
rendant la liste via `createPortal(..., document.body)`, positionnée en
`position: fixed` à partir de `getBoundingClientRect()` du champ (recalculée
au scroll/redimensionnement tant qu'elle est ouverte) — échappe complètement
aux contextes d'empilement des cartes ancêtres.

**Vérifié en vrai** : suggestions correctes et cliquables sur les trois
écrans (réception, sortie, retour), auto-remplissage du type/fournisseur
confirmé par lecture directe des champs après clic. `tsc`/`eslint`/`next build`
propres.

## Filtres en fenêtre modale

`src/components/ui/filter-button.tsx` (`<FilterButton>`) + `src/components/ui/modal.tsx`
(`<Modal>`) — appliqué aux 3 pages avec des filtres (`/stock`, `/sorties`,
`/receptions`) : la barre de filtres autrefois toujours visible est remplacée
par un bouton compact (icône entonnoir, pastille avec le nombre de filtres
actifs), posé **en ligne dans l'en-tête** à côté de `<ViewToggle>`, qui ouvre
une fenêtre modale listant les mêmes contrôles (recherche + menus déroulants),
plus un bouton « Réinitialiser les filtres » quand au moins un est actif. Le
filtrage reste **live** (aucune étape « Appliquer » séparée) — seul
l'emplacement des contrôles change, pas le comportement.

**Deux itérations avant la version en ligne actuelle, deux bugs réels trouvés :**

1. Premier essai en bouton **flottant, `position: fixed`, ancré en bas** de
   l'écran (`bottom-24`/`bottom-8`) — se retrouvait positionné très loin en bas
   de la page plutôt que collé à l'écran. Cause : `.oa-rise` (l'animation
   d'entrée présente sur toutes les pages) se termine sur
   `transform: translateY(0)` — **pas** `transform: none` — et *toute* valeur
   de `transform` (même une identité) crée un bloc de confinement CSS pour les
   descendants en `position: fixed`. Corrigé une première fois avec un portail
   (`createPortal(..., document.body)`, la leçon du bug précédent avec
   `<SerialSearch>`).
2. Une fois le portail en place, le bouton était bien fixé à l'écran — mais
   **ancré en bas restait peu fiable en pratique** (l'utilisateur devait
   scrouler pour l'atteindre) : un `position: fixed; bottom` est le cas le
   moins bien géré par les navigateurs mobiles, dont la barre d'outils
   dynamique rétrécit/agrandit la zone visible depuis le bas (Chrome Android en
   particulier). Déplacé en haut (`top-20`/`top-44`) : toujours flottant, mais
   chevauchait alors visuellement `<ViewToggle>` posé au même endroit dans
   l'en-tête. **Solution retenue** : abandon complet du `position: fixed`/portail
   pour ce bouton — rendu en ligne dans l'en-tête, à côté de `<ViewToggle>`.
   Toujours visible dès le chargement, sans interaction, sans conflit visuel,
   et sans dépendre d'aucun comportement de navigateur mobile. `<Modal>`, lui,
   reste construit avec un portail (nécessaire : il doit pouvoir s'afficher
   par-dessus tout le reste de l'écran).

**Vérifié en vrai** : bouton et pastille bien visibles sans scroll ni conflit
visuel, en desktop (1280px) et mobile (390px) ; sélection d'un filtre dans la
modale confirmée réellement appliquée (nombre de résultats mis à jour) ;
badge « 1 actif » affiché après fermeture ; modale et contrôles corrects sur
les trois pages. `tsc`/`eslint`/`next build` propres.

## Bascule liste/cartes sur les tableaux

`src/lib/use-view-mode.ts` (`useViewMode(cle)`) + `src/components/ui/view-toggle.tsx`
(`<ViewToggle>`) — appliqué aux 7 tableaux du projet : `/stock`, `/fournisseurs`,
`/clients`, `/sorties`, `/receptions` (listes) et les lignes de `/sorties/[id]`,
`/receptions/[id]`. Préférence liste/cartes persistée par écran dans
`localStorage` (clé `oils-stock-vue-<cle>`, une par tableau) ; **en dessous du
breakpoint mobile (`sm:`, 640px), la vue cartes est forcée** quelle que soit la
préférence enregistrée — un tableau large ne convient de toute façon pas à un
téléphone — et le bouton de bascule est alors masqué (inutile puisqu'il n'y a
plus rien à choisir). Même idiome que `useTheme` (`lib/theme.ts`) pour éviter
un décalage d'hydratation : l'état initial reste desktop/liste au premier
rendu, la vraie valeur stockée n'étant lue qu'après le montage.

`src/components/ui/card-field.tsx` (`<CardField>`) factorise la paire
libellé/valeur utilisée dans chaque carte (même style que les fiches détail
fournisseur/client).

## Exports CSV & gestion des comptes (Jalon 6)

`src/lib/download.ts` (`telechargerFichier`, `nomFichierDateDuJour`) — même
pattern que le bon de sortie PDF (fetch authentifié → blob → `<a download>`
programmatique, l'endpoint exige un jeton JWT) généralisé aux exports CSV.
Boutons « Exporter » sur `/stock`, `/sorties`, `/receptions` : construisent la
même `URLSearchParams` que la liste (factorisée dans une fonction
`paramsFiltres()` partagée entre le fetch de liste et l'export) pointée vers
`.../export/` au lieu de `.../`.

`/parametres` (`src/app/(app)/parametres/page.tsx`) remplace l'`EmptyState`
« Jalon 6 » qui y était depuis le début — une seule page (pas de fiche détail
séparée, le volume de comptes reste faible) : liste, formulaire de création
(bascule d'affichage), rôle et statut actif/inactif modifiables **en ligne**
dans le tableau (`<select>`/badge cliquable, `PATCH` immédiat). La ligne de
l'utilisateur courant a son rôle/statut désactivés et pas de bouton
supprimer — cohérent avec les garde-fous déjà posés côté API (impossible de
se retirer son propre rôle admin ou de se supprimer soi-même).

## API

Toutes les routes métier sont **versionnées côté backend** sous `/api/v1/` (ex. `/api/v1/fournisseurs/`). `lib/api.ts` centralise ça dans la constante `API_V1` — `authFetch()` l'ajoute automatiquement, les appels applicatifs passent des chemins relatifs (`authFetch("/fournisseurs/")`, pas `authFetch("/api/fournisseurs/")`).

## Avancement

**Jalon 1 — socle**

- [x] 1d — scaffold Next.js, connexion JWT, `/api/v1/auth/me/`, gabarit de navigation par rôle, listes fournisseurs/clients branchées sur l'API.
- [x] Refonte UI/UX complète — Glassmorphism/Liquid Glass, dashboard data-driven, navigation desktop + mobile (tiroir + bottom nav), design system réutilisable.
- [x] Mode sombre — système + bascule manuelle persistée, script anti-flash, tokens uniquement (aucun composant à réécrire).

**Jalon 2 — sorties & retours**

- [x] `/sorties` — liste (recherche, filtres client/statut/date, deep-link depuis le tableau de bord)
- [x] `/sorties/nouvelle` — en-tête (client, projet avec autocomplétion, TRD, date)
- [x] `/sorties/[id]` — ajout/retrait de lignes par numéro de série, validation, annulation (motif), téléchargement du bon de sortie (PDF, via blob + lien programmatique — l'endpoint exige un jeton JWT, pas de simple `<a href>`)
- [x] `/retours` — enregistrement d'un retour (lignes répétables, résumé du résultat)
- [x] Tableau de bord : panneau « Sorties & retours » et « Activité récente » branchés sur les vraies données

**Jalon 3 — entrées manuelles & reprise**

- [x] `/receptions` — liste (recherche, filtres nature/statut/fournisseur, deep-link `?statut=` depuis le tableau de bord)
- [x] `/receptions/nouvelle` — en-tête saisie manuelle (fournisseur, référence fournisseur, date, quantité annoncée)
- [x] `/receptions/reprise` — en-tête de reprise (réservé admin, aucun fournisseur d'en-tête)
- [x] `/receptions/[id]` — ajout de lignes à l'unité ou par plage (préfixe + début + fin, largeur auto), champ fournisseur (code, existant ou nouveau) affiché seulement en reprise, badge de statut par ligne (OK/Doublon), écart avec la quantité annoncée signalé sans bloquer, validation (bloquée tant qu'une ligne n'est pas OK), annulation (motif)
- [x] Tableau de bord : panneau renommé « Mouvements de stock », réceptions incluses partout (KPIs, activité récente)

**Jalon 4 — extraction des documents**

- [x] `/receptions/nouvelle` — bascule Saisie manuelle / Arrivage (PDF), upload multipart (`FormData`, pas de `Content-Type` manuel — le navigateur pose le bon `boundary` multipart)
- [x] `/receptions/[id]` — panneau « Document d'arrivage » (visible dès qu'un `ARRIVAGE` a un fichier, quel que soit son statut) : PDF affiché via le visualiseur natif du navigateur dans un `<iframe>`, alimenté par un **blob** récupéré via `authFetch` (jamais l'URL média brute — voir plus bas) ; panneau « Extraction automatique » (uniquement en `BROUILLON`) avec sélecteur de type d'article, bouton « (Re)lancer l'extraction », alerte si détection générique, et bandeau de plage incomplète avec un raccourci qui préremplit directement le formulaire « Générer une plage » déjà existant (Jalon 3)
- [x] `/fournisseurs` — ligne dépliable par fournisseur montrant/éditant son profil d'extraction, badge « Profil réglé »/« Générique » par ligne

**PDF via blob, pas via l'URL média brute** : la même précaution que le bon de sortie (Jalon 2) s'imposait ici aussi, pour une raison de plus — un **CORS réel** est apparu en test (frontend et API pas sur le même hôte dès qu'un tunnel s'interpose ; la configuration CORS de l'API ne s'appliquait pas à `/media/` comme à `/api/v1/`). Le fichier est donc récupéré via `authFetch("/receptions/{id}/fichier/")`, transformé en `URL.createObjectURL(blob)`, et c'est cette URL locale qui alimente l'`<iframe>` — aucune requête réseau supplémentaire au moment de l'affichage, aucun souci CORS possible.

**Jalon 5 — OCR & scan mobile**

- [x] `/scan` — caméra plein écran (capture → `POST /unites/scanner/`), saisie manuelle
      en repli (`GET /unites/lookup/`), résultats triés résolus-d'abord
- [x] Mode « ajout à la sortie en cours » (`/scan?sortie=<id>`, lien depuis
      `/sorties/[id]` réservé magasinier/admin) — bouton « Ajouter » par unité
      résolue `EN_STOCK`, réutilise `POST /sorties/{id}/lignes/` du Jalon 2
- [x] Sans `?sortie=`, résolution pure : badge de statut (En stock/Sorti)
- [x] Raccourci caméra dans l'en-tête mobile (`mobile-header.tsx`)
- [x] `useSearchParams()` enveloppé dans un `<Suspense>` — sinon `next build` échoue
- [ ] HTTPS local activé en continu côté dev (recherche/documentation faites, pas encore le mode de travail par défaut — voir section ci-dessus)
- [ ] Vérification caméra réelle sur téléphone (faite jusqu'ici seulement via saisie manuelle, caméra indisponible en environnement de test automatisé)

**Vérifié en vrai** (`browser-automation`, `http://localhost:3000` — voir note CORS
dans la mémoire de session, `127.0.0.1` est refusé par `CORS_ALLOWED_ORIGINS`) :
cycle complet magasinier1 → sortie brouillon → « Scanner » → `/scan?sortie=...` →
recherche manuelle d'un numéro réel → résultat + bouton « Ajouter » → ajout confirmé
(`POST` réel) → retour à la sortie → unité bien présente dans le tableau. Zéro erreur
console, zéro requête échouée. `tsc`/`eslint`/`next build` propres.

**Fournisseurs & clients — fiches complètes (hors plan initial, demandé après coup)**

- [x] `/fournisseurs/nouveau`, `/clients/nouveau` — création (garde de rôle côté route)
- [x] `/fournisseurs/[id]`, `/clients/[id]` — fiche détail éditable + petites stats réelles
- [x] Profil d'extraction déplacé de l'accordéon de liste vers la fiche fournisseur
- [x] Bug backend trouvé et corrigé en testant : code réutilisé après suppression logique
      plantait en 500 — voir README backend, 2 tests de régression ajoutés

**Recherche de numéro de série en direct (hors plan initial, demandé après coup)**

- [x] `<SerialSearch>` — suggestions dès 2 caractères, icône par type, badge de statut
- [x] Branché sur `/receptions/[id]`, `/sorties/[id]` et `/retours` (partout où on saisit un numéro)
- [x] Bug trouvé et corrigé : liste invisible-cliquable sous le tableau de `/sorties/[id]`
      (contexte d'empilement `backdrop-blur` de `GlassCard`) — corrigé via portail React

**Bascule liste/cartes (hors plan initial, demandé après coup)**

- [x] `useViewMode`/`<ViewToggle>` — préférence persistée par tableau, cartes forcées sous 640px
- [x] Appliqué aux 7 tableaux : stock, fournisseurs, clients, sorties, réceptions (listes) + lignes de sortie/réception
- [x] Bascule masquée en dessous du breakpoint mobile (rien à choisir, cartes déjà forcées)

**Vérifié en vrai** : bascule liste→cartes sur `/stock` (desktop 1280px), persistance
confirmée après rechargement (`localStorage`), forçage cartes confirmé à 390px même
avec une préférence "liste" enregistrée, bouton de bascule bien absent sur mobile.
Cartes cliquables vérifiées sur `/fournisseurs`, état vide correct sur les lignes
d'une sortie sans unité. `tsc`/`eslint`/`next build` propres.

**Filtres en fenêtre modale (hors plan initial, demandé après coup)**

- [x] `<FilterButton>`/`<Modal>` — bouton (en ligne dans l'en-tête, voir section dédiée) + fenêtre modale sur stock/sorties/réceptions
- [x] Pastille avec le nombre de filtres actifs, bouton « Réinitialiser les filtres »
- [x] Deux bugs de positionnement trouvés et corrigés en cours de route (contexte d'empilement `.oa-rise`, puis conflit visuel une fois ancré en haut) — voir section dédiée pour le détail complet

**Jalon 6 — Pilotage & mise en production (volet applicatif, en cours)**

- [x] Boutons « Exporter » (CSV) sur `/stock`, `/sorties`, `/receptions` — respectent les filtres actifs
- [x] `/parametres` — liste des comptes, création, édition inline du rôle et du statut actif/inactif, suppression
- [x] Bouton « Annuler » masqué pour le magasinier sur une sortie/réception validée (admin uniquement, voir README backend)
- [x] Répartition Flexitank/Heating pad sur la fiche fournisseur + 5 dernières transactions (demandé après coup)
- [x] Répartition Flexitank/Heating pad aussi sur la liste `/fournisseurs` (liste et cartes, demandé après coup)
- [x] Seuil de réapprovisionnement par type, par fournisseur — alerte visuelle sur la liste et la fiche détail (demandé après coup)
- [x] Tableau de bord analytique — stock dormant, seuil dynamique, sorties mensuelles (line chart + moyenne mobile), prévisions de commande ; 2 nouvelles pages (`/stock-dormant`, `/previsions`), 2 composants graphiques SVG maison, boucle N+1 du dashboard supprimée, bug soft-delete de comptage corrigé (demandé après coup)
- [x] Notifications web push + in-app — cloche + badge + dropdown + toast + page `/notifications`, service worker, abonnement VAPID ; déclenché à la validation d'une sortie/réception, au franchissement de seuil, au passage à zéro (demandé après coup)
- [x] PWA installable + responsive mobile « le socle » (Phase 1, demandé après coup) — manifest complet, icônes maskables, service worker étendu à la main (cache-first coquille/assets, network-first + repli cache pour les GET API, page `/offline`), lecture hors-ligne (démarrage à froid inclus, sans déconnexion), indicateur de connexion, sheets d'installation/notifications, 3 pages sans vue cartes corrigées, cibles tactiles ≥ 44 px, safe-areas, retour Android ferme les overlays ; 2 bugs trouvés et corrigés (pollution du cache de navigation par les requêtes RSC, défilement horizontal fantôme causé par le tiroir mobile fermé).
- [x] Écriture hors-ligne + synchronisation (Phase 2, demandé après coup) — file Dexie/IndexedDB, moteur de synchro séquentiel, idempotence backend (`Idempotency-Key`), créations/éditions/lignes de sortie et réception (SAISIE) hors-ligne ; bug réel trouvé et corrigé (redirection automatique cassée hors-ligne, voir section dédiée) ; vérifié bout en bout, y compris le retrait local d'une ligne pas encore synchronisée (0 appel réseau).
- [ ] Cohérence des badges d'alerte fournisseurs avec le seuil *effectif* (manuel OU calculé) — reste sur le seuil manuel seul pour l'instant (Phase 8 du plan, optionnel)
- [ ] Docker Compose + Caddy + sauvegardes automatiques (volet déploiement — pas commencé)

**Vérifié en vrai** : création d'un compte → modification du rôle → suppression,
bout en bout ; export CSV téléchargé et son contenu inspecté (BOM UTF-8 correct,
séparateur `;`, données réelles) ; bouton « Annuler » confirmé visible pour
l'admin et absent pour le magasinier sur la **même** sortie validée ; répartition
par type vérifiée sur la fiche détail et sur la liste (vues liste et cartes),
chiffres réels identiques entre les deux écrans. `tsc`/`eslint`/`next build` propres.

## Comptes de dev (voir `oils-stock-api/README.md`)

`admin` / `admin1234` (ADMIN) · `magasinier1` / `magasinier1234` (MAGASINIER) · `lecteur1` / `lecteur1234` (LECTURE)
