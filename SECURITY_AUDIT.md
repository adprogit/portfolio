# Audit sécurité, données et légalité

Audit réalisé le 24 octobre 2026 sur la branche `redesign`, avant la refonte.
Point de départ : `main` @ `5fa8d05`.

Trois sections : ce qui a été **vérifié**, ce qui a été **corrigé**, et ce qui
**reste à votre charge**. La dernière est la plus importante.

---

## 1. Vérifié, sans problème trouvé

### Secrets

- **gitleaks 8** a scanné tout l'historique git (toutes les branches,
  `gitleaks git`) puis l'arbre de travail (`gitleaks dir`). Résultat :
  **0 fuite**.
- Une recherche manuelle complète le scan : `.env*`, `*.pem`, `*.key`, motifs
  `sk-`, `ghp_`, `AKIA`, `api_key`, `token`, `secret`, `password`. Rien trouvé
  hors des faux positifs du code (noms de variables comme `token` dans le
  parseur PGN).
- **Aucune clé API côté client.** Le site n'appelle aucune API. Le JavaScript
  livré ne fait aucun `fetch` vers l'extérieur, et la CSP l'interdit
  (`connect-src 'self'`).

### Dépendances

- `package-lock.json` est commité, et `npm ci` en CI installe exactement ce
  lockfile.
- `.npmrc` contient `save-exact=true` (versions figées) et
  `ignore-scripts=true` : aucun script d'installation tiers ne s'exécute.
- **Aucune dépendance au runtime.** Le site ne charge ni Three.js ni CDN. Tout
  le JS servi est écrit pour le site (44,9 Ko sur un budget de 48 Ko, contrôlé
  par `tools/audit-dist.mjs`).

### En-têtes et CSP

La CSP est posée par une balise `<meta>` dans `src/layouts/BaseLayout.astro`.
En production, `tools/csp-hashes.mjs` remplace `'unsafe-inline'` de
`script-src` par les empreintes SHA-256 des scripts inline. Le build échoue
s'il en reste un.

```
default-src 'self'; img-src 'self'; media-src 'self'; font-src 'self';
style-src 'self' 'unsafe-inline'; script-src 'self' 'sha256-…';
connect-src 'self'; form-action 'none'; base-uri 'none'; object-src 'none';
frame-src 'none'; worker-src 'none'
```

S'y ajoutent `<meta name="referrer" content="no-referrer">` et
`<meta name="robots" content="noindex">`.

### Liens externes

Tous portent `rel="noopener noreferrer"`. `audit-dist.mjs` refuse, au build,
tout lien sortant qui ne vise pas `github.com/<compte>` ou
`linkedin.com/in/…`. Il refuse aussi `innerHTML`, `eval` et `new Function`
dans le JS livré.

### GitHub Actions (`.github/workflows/pages.yml`)

- Uniquement des actions officielles `actions/*`, **épinglées par SHA**.
- Permissions minimales : `contents: read` au niveau global. Seul le job de
  déploiement reçoit `pages: write` et `id-token: write`.
- `persist-credentials: false` sur le checkout.
- Aucun secret utilisé, donc aucun secret qui pourrait apparaître dans les
  logs.

### RGPD

- **Aucun traceur.** Pas d'analytics, pas de pixel, pas de police Google, pas
  d'embed tiers. Les polices sont auto-hébergées (Fontsource, OFL).
- **Aucun cookie.** Le site n'en dépose aucun, ni lui ni un tiers, puisqu'il ne
  charge aucune ressource tierce.
- **Une seule écriture locale :** `localStorage["theme"]` (clair ou sombre),
  écrite seulement quand le visiteur clique sur le bouton de thème. C'est une
  préférence d'interface demandée par l'utilisateur. Les lignes directrices de
  la CNIL sur les traceurs (2020) l'exemptent de consentement.
- **Confirmation : aucune bannière cookies n'est nécessaire.** Il faudra la
  revoir si l'on ajoute un jour des statistiques, un embed ou une police tierce
  (voir § 3.6).
- **Pas de formulaire de contact,** et aucune adresse e-mail sur le site.
- Le lecteur PGN de l'échiquier traite le fichier **localement**, dans le
  navigateur. Rien n'est envoyé.

---

## 2. Corrigé sur `redesign`

| Commit | Correction |
|---|---|
| `4005d72` | Métadonnées retirées des PNG du dépôt (chunks `tEXt`/`tIME` : logiciel, date). Pixels vérifiés identiques par empreinte avant et après. Aucun JPEG ne portait d'EXIF (GPS, appareil). La vidéo `detection.mp4` était déjà sans audio ni métadonnées. |
| `7ddc0be` | `npm audit fix` : **7 vulnérabilités transitives corrigées** (fast-uri, http-cache-semantics, sharp/librsvg, source-map-js, undici, vite, zod ; dont des « high »). `npm audit` affiche maintenant **0 vulnérabilité**. Seul le lockfile change, et `npm run verify` passe. |
| `d6401b1` | `.gitignore` complété : clés (`*.pem`, `*.key`, `*.p12`, `id_rsa*`…), identifiants (`credentials*.json`, `service-account*.json`), configurations locales, dumps (`*.sql`, `*.dump`, `*.sqlite`, `*.db`), checkpoints de notebooks. |
| `9bd1ffe` | `.github/dependabot.yml` : mises à jour npm chaque semaine (mineures et correctifs groupés), et GitHub Actions chaque mois. Dependabot met à jour les SHA épinglés. |
| `ea77a6b` | `CREDITS.md` : inventaire des polices, icônes, images et données, avec source et licence. La notice ISC de Lucide y figure. |
| *(ce commit)* | Ce rapport, et les brouillons `legal/mentions-legales.md` et `legal/confidentialite.md`. |

---

## 3. À votre charge

### 3.1 Tag `v1.0` — **à pousser vous-même** 🔴

Le tag annoté `v1.0` a été créé sur `5fa8d05`, la tête de `main` servie par
Pages. Le proxy git de cette session a cependant **refusé de le pousser**
(HTTP 403 : cette session ne peut pousser que des branches). Depuis votre clone
local :

```sh
git fetch origin
git tag -a v1.0 -m "Portfolio v1 – avant refonte" 5fa8d05
git push origin v1.0
```

### 3.2 Réglages du dépôt sur GitHub (non lisibles depuis la session)

- **Settings → Pages → Enforce HTTPS** : à cocher. C'est le réglage par défaut
  sur `*.github.io`, mais vérifiez-le.
- **Settings → Code security** :
  - activer *Dependabot alerts* et *Dependabot security updates* ;
    `dependabot.yml` ne gère que les mises à jour de version ;
  - activer *Secret scanning* et *Push protection* (gratuits sur un dépôt
    public).
- **Settings → Branches** : une règle de protection sur `main` (PR
  obligatoire, pas de force-push) est recommandée.

### 3.3 Ce que la CSP en `<meta>` ne couvre pas ⚠️

GitHub Pages ne permet pas d'envoyer d'en-têtes HTTP personnalisés. Le fichier
`public/_headers` est **ignoré** par Pages : il ne sert que sur
Netlify/Cloudflare Pages. Par conséquent :

- **`frame-ancestors` est impossible en `<meta>`.** Le site peut être affiché
  dans une iframe par un tiers (risque de *clickjacking*, faible ici car il n'y
  a aucune action sensible à piéger).
- **Pas de `X-Frame-Options`, `X-Content-Type-Options`, `Permissions-Policy`,
  ni `Strict-Transport-Security` propre au site.** Pour HSTS, GitHub en envoie
  un sur `*.github.io`.
- **Pas de `report-uri` / `report-to`** : vous ne serez pas prévenu d'une
  violation de la CSP.
- **`style-src 'unsafe-inline'` est conservé, et c'est un choix assumé.** Le
  site utilise 217 attributs `style=` (variables CSS des sprites, de l'effet
  de frappe…) et 14 blocs `<style>` générés par Astro. Les hacher est
  impossible : un attribut `style=` ne se hache pas sans `'unsafe-hashes'`.
  Le risque résiduel est l'injection de CSS, sans exécution de code, sur un
  site sans saisie utilisateur. Une version plus stricte reste possible pendant
  la refonte, en remplaçant les `style=` par des classes ; c'est un chantier à
  part.
- Le script de thème reste **inline** (haché) pour éviter un flash de thème au
  chargement. Les autres scripts sont des modules externes.

Pour aller plus loin, il faut placer un CDN devant Pages (Cloudflare,
gratuit), qui peut poser ces en-têtes, ou héberger le site sur Netlify ou
Cloudflare Pages.

### 3.4 Licences des assets — voir `CREDITS.md`

Par ordre de priorité :

1. **`cuda-motion/detection.mp4`** : une personne y est peut-être
   identifiable. Le droit à l'image exige son accord, sinon il faut flouter ou
   retirer la vidéo. Je n'ai pas pu décoder la vidéo dans la session :
   **regardez-la**.
2. **IRM `itk-vtk` (`case6_gre*.nrrd`)** : ce sont des données de santé.
   Vérifiez qu'elles sont anonymisées, ainsi que leur source et leur licence.
3. **Images COCO (`unet-coco/`)** : chaque image Flickr a sa propre licence,
   dont certaines NC ou ND. Vérifiez les ID des images montrées, ou remplacez
   ces images par des images CC0 ou CC BY.
4. **LIDC-IDRI (`pulmonix/`)** : la licence CC BY 3.0 impose une citation
   (TCIA + article Armato et al. 2011). Il faut l'ajouter sur la page projet.
5. **Sources inconnues** : vidéo de trafic (`cuda-motion/mask.png`), texture
   d'écorce de POGL, scan de sudoku tiré d'un journal.

### 3.5 Propriété intellectuelle : projets d'école ou d'équipe ⚠️

Je n'ai trouvé aucun projet d'employeur ou de client. En revanche, plusieurs
projets viennent de l'école ou d'une équipe. Vérifiez que le règlement de
l'EPITA et vos coéquipiers autorisent leur publication :

| Projet | Contexte constaté | Point d'attention |
|---|---|---|
| 42sh, Tiger | Projets EPITA | Le règlement interdit souvent de publier le code des sujets notés. Captures seules ? |
| Raiders Sudoku | Organisation `42-seconds-to-Epita` | Projet de groupe EPITA. |
| Tumor Follow-up (itk-vtk) | README : « Mini Projet – module ITK/VTK », auteurs **Klervi Choblet, Alex Dreau, Roman Miralves** | **Les co-auteurs ne sont pas crédités sur la page.** Le dépôt `adprogit/itk-vtk` est public mais la page affiche « Dépôt privé » (champ `repo` manquant). |
| Bac à golf | EPITA, équipe de 7 | L'équipe est déjà créditée. ✅ |
| ToonGL / POGL | Probablement un cours OpenGL de l'EPITA | À confirmer. |
| CUDA motion | Dépôt privé `Palpatoche8/…`, probablement un cours | À confirmer, avec l'accord du propriétaire du dépôt. |
| Pulmonix | Dépôt d'équipe `Evrard11/medviz-metastazix` | Accord de l'équipe. |
| zugzwang | Équipe, MIT | La licence couvre le code. ✅ |
| Graph-Segmentator, U-Net COCO | Contexte inconnu | À confirmer. |

### 3.6 Choix à faire

- **Licence du code (`LICENSE`)** : votre choix est attendu. Ma
  recommandation est MIT pour le code, et « tous droits réservés » ou CC BY-NC
  4.0 pour les textes et images.
- **Mentions légales et confidentialité** : les brouillons sont dans
  `legal/`, avec des champs `[À COMPLÉTER]`. Aucune information personnelle
  n'a été inventée. Ils seront intégrés au site une fois relus.
- **Statistiques (facultatif)** : si vous en voulez, deux options sans cookie
  et sans bannière :
  - **GoatCounter** (hébergé, gratuit pour un usage personnel, open source) :
    pas de cookie ni d'identifiant persistant, l'IP n'est pas stockée.
    Inconvénients : un tiers reçoit l'URL visitée et l'IP en transit, et il
    faut ouvrir la CSP (`script-src` + `connect-src` vers `*.goatcounter.com`)
    ainsi que l'audit.
  - **Umami ou Plausible auto-hébergés** (via Docker, sur votre serveur) :
    mêmes garanties, sans tiers, mais à maintenir.

  Dans les deux cas, la mesure d'audience peut être exemptée de consentement
  selon la CNIL, si elle reste anonyme et limitée. La politique de
  confidentialité devra alors le mentionner. **Recommandation : rien pour
  l'instant.**
- **Contact** : si vous voulez une adresse e-mail sur le site, donnez-la-moi.
  Je l'ajouterai en `mailto:` obfusqué (assemblée en CSS ou JS, absente du
  HTML brut) plutôt qu'avec un formulaire.
- **`noindex`** : le site est aujourd'hui exclu des moteurs de recherche. C'est
  bon pour la discrétion, moins bon pour une recherche d'emploi. À décider.
