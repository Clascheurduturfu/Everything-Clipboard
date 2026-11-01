plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.clipsync"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.clipsync"
        minSdk = 26
        targetSdk = 36
        versionCode = 9
        versionName = "2.0-rc.4"
        testInstrumentationRunner = "com.clipsync.PrivacyFlowInstrumentation"
    }

    signingConfigs {
        create("release") {
            storeFile = System.getenv("CLIPSYNC_STORE_FILE")?.let { file(it) }
            storePassword = System.getenv("CLIPSYNC_STORE_PASSWORD")
            keyAlias = System.getenv("CLIPSYNC_KEY_ALIAS")
            keyPassword = System.getenv("CLIPSYNC_KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }
}

// Never silently produce an unsigned release when private credentials are absent.
gradle.taskGraph.whenReady {
    if (allTasks.any { it.project == project && it.name.contains("Release") } &&
        listOf("CLIPSYNC_STORE_FILE", "CLIPSYNC_STORE_PASSWORD", "CLIPSYNC_KEY_ALIAS", "CLIPSYNC_KEY_PASSWORD")
            .any { System.getenv(it).isNullOrBlank() }) {
        throw GradleException("Release signing is missing. Run build-release.ps1; see RELEASE_SIGNING.md.")
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
