# Guide de Déclaration Google Play Console : FOREGROUND_SERVICE_DATA_SYNC

Pour publier **ClipSync v2.0** sur le Google Play Store en ciblant Android 14+ (targetSdk 34/35), Google exige une déclaration détaillée de l'utilisation de la permission `FOREGROUND_SERVICE_DATA_SYNC`.

Voici le guide complet avec les réponses textuelles exactes à copier-coller dans la Play Console, ainsi que le scénario pour la vidéo de démonstration requise.

---

## 1. Localisation dans la Google Play Console

1. Rendez-vous sur votre [Google Play Console](https://play.google.com/console).
2. Sélectionnez l'application **ClipSync**.
3. Dans le menu latéral gauche, sous **Politique et programmes**, cliquez sur **Contenu de l'application**.
4. Repérez la section **Autorisations d'accès aux services de premier plan** (Foreground service permissions) et cliquez sur **Démarrer** ou **Gérer**.
5. Cochez le type de service : **dataSync** (Synchronisation des données).

---

## 2. Réponses à copier-coller dans le formulaire

### Question 1 : Fonctionnalité principale destinée à l'utilisateur (Core user-facing purpose)
> **FR :**  
> Synchronisation instantanée et chiffrée de bout en bout du presse-papier (texte et images) entre les appareils personnels de l'utilisateur (Android, PC Windows, Mac).
>
> **EN (recommandé si la console est en anglais) :**  
> Real-time, end-to-end encrypted clipboard synchronization (text and images) between the user's paired personal devices (Android, Windows PC, Mac).

---

### Question 2 : Pourquoi un service de premier plan est-il obligatoire ? Pourquoi WorkManager / JobScheduler ne conviennent pas ?
> **FR :**  
> ClipSync maintient une connexion WebSocket persistante et chiffrée avec le relais de synchronisation pour échanger instantanément le contenu du presse-papier dès qu'un élément est copié ou reçu. Les API différées telles que WorkManager ou JobScheduler imposent une latence de plusieurs minutes et des regroupements par lots, ce qui rend la synchronisation instantanée du presse-papier inutilisable pour l'utilisateur. Le service de premier plan garantit que la connexion reste active lorsque l'application passe en arrière-plan, avec une notification permanente informant l'utilisateur en toute transparence que la synchronisation est en cours.
>
> **EN :**  
> ClipSync maintains a persistent encrypted WebSocket connection to the relay server to synchronize clipboard items instantaneously when copied or received across devices. Deferred background tasks (WorkManager / JobScheduler) introduce batching and latency of several minutes, which breaks real-time clipboard workflows. The foreground service ensures the socket remains active in the background, with an ongoing notification ensuring transparency and letting the user know sync is actively running.

---

### Question 3 : Comment l'utilisateur initie-t-il et contrôle-t-il ce service ?
> **FR :**  
> Le service est entièrement contrôlé par l'utilisateur. Il est démarré ou arrêté soit via l'interrupteur principal dans l'application, soit directement depuis la tuile des Paramètres Rapides (Quick Settings Tile). L'utilisateur peut désactiver le service à tout moment. Une notification persistante indique en permanence l'état de la connexion (Connecté / Reconnexion).
>
> **EN :**  
> The service is entirely user-controlled. It is started and stopped either via the main toggle switch inside the application or via the Quick Settings Tile. The user can stop synchronization at any time. A persistent foreground notification continuously displays the connection state (Connected / Reconnecting).

---

## 3. Vidéo de démonstration obligatoire (Lien YouTube non répertorié)

Google exige un lien vers une vidéo courte (30 à 60 secondes) montrant la fonctionnalité en conditions réelles.

### Checklist de la vidéo (à filmer sur votre téléphone/tablette) :
1. **Démarrage du service (0:00 - 0:10) :**
   - Ouvrir ClipSync.
   - Activer l'interrupteur **Sync Service**.
   - Dérouler le volet des notifications pour montrer la notification persistante :  
     `ClipSync Active - Connecté au relais`.
2. **Synchronisation en direct (0:10 - 0:25) :**
   - Mettre ClipSync en arrière-plan (retour à l'écran d'accueil).
   - Copier un texte ou une image sur votre PC ou Mac.
   - Montrer la réception immédiate sur le téléphone (notification de réception ou presse-papier mis à jour).
   - Réciproquement, copier un texte sur le téléphone et montrer qu'il arrive sur l'ordinateur.
3. **Arrêt du service (0:25 - 0:35) :**
   - Ouvrir la tuile des Réglages Rapides ou rouvrir l'app pour désactiver le service.
   - Montrer que la notification persistante disparaît.

### Publication de la vidéo :
- Mettre la vidéo sur YouTube avec la visibilité : **Non répertoriée (Unlisted)**.
- Coller l'URL `https://youtu.be/...` dans le champ prévu à cet effet dans la Google Play Console.

---

## 4. Vérification technique des déclarations dans le code

Le projet contient déjà l'ensemble des déclarations obligatoires :

- `AndroidManifest.xml` :
  ```xml
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />

  <service
      android:name=".ClipSyncService"
      android:foregroundServiceType="dataSync"
      android:exported="false" />
  ```
- `build.gradle.kts` :
  ```kotlin
  compileSdk = 35
  targetSdk = 35
  versionCode = 5
  versionName = "2.0"
  ```
- Fichiers de production prêts :
  - Bundle Play Store : `android-app/ClypSync.aab`
  - APK direct : `android-app/ClypSync.apk`
