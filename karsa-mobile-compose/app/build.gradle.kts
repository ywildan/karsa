plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

val keystorePath = System.getenv("KARSA_KEYSTORE_FILE")
val keystorePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
val keystoreAlias = System.getenv("ANDROID_KEY_ALIAS")
val keystoreKeyPassword = System.getenv("ANDROID_KEY_PASSWORD")
val canSignRelease = keystorePath != null && file(keystorePath).exists() &&
    !keystorePassword.isNullOrEmpty() && !keystoreAlias.isNullOrEmpty() && !keystoreKeyPassword.isNullOrEmpty()

android {
    namespace = "ac.id.untidar.karsa"
    compileSdk = 35

    defaultConfig {
        applicationId = "ac.id.untidar.karsa_mobile"
        minSdk = 26
        targetSdk = 35
        versionCode = (providers.gradleProperty("karsaVersionCode").orNull ?: "30000").toInt()
        versionName = providers.gradleProperty("karsaVersionName").orNull ?: "3.0.0-slice1"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    signingConfigs {
        if (canSignRelease) {
            create("release") {
                storeFile = file(keystorePath!!)
                storePassword = keystorePassword
                keyAlias = keystoreAlias
                keyPassword = keystoreKeyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
