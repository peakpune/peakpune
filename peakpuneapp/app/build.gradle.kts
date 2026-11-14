import com.android.build.api.variant.ApplicationAndroidComponentsExtension

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.overtimelabs.peakpune"
    compileSdk = 37

    defaultConfig {
        // THE ONE PLACE the Play package name is set. Peak Pune is a separate app from
        // PunePedia. The Kotlin namespace above is independent of it.
        applicationId = "com.overtimelabs.peakpuneapp"
        minSdk = 26 // variable fonts (Fraunces, Inter) need API 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Signed with the debug key until android/key.properties-style signing is added
            // (see README). Installable for testing; Google Play needs your upload key.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures { compose = true }
    testOptions { unitTests.isIncludeAndroidResources = true }
}

kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }

/** Copies the repository's data files into the app's assets at build time, so the app
 *  always ships exactly what is in ../data. Nothing is copied by hand. */
abstract class SyncPeakData : DefaultTask() {
    @get:InputDirectory
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val dataDir: DirectoryProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @TaskAction
    fun sync() {
        val out = outputDir.get().asFile.resolve("data").apply { deleteRecursively(); mkdirs() }
        val src = dataDir.get().asFile
        val files = mapOf(
            "publication-audit.json" to "publication-audit.json",
            "batch-1-places/places.json" to "places.json",
            "batch-2-outdoors/outdoors.json" to "outdoors.json",
            "batch-3-events/events.json" to "events.json",
            "batch-4-meetups/meetups.json" to "meetups.json",
            "metro/metro.json" to "metro.json",
            "metro/areas.json" to "areas.json",
            "history.json" to "history.json", // optional until supplied
            "shopping.json" to "shopping.json", // optional until supplied
        )
        files.forEach { (from, to) ->
            val f = src.resolve(from)
            if (f.exists()) f.copyTo(out.resolve(to), overwrite = true)
            else if (to != "history.json" && to != "shopping.json") throw GradleException("Missing data file: $from")
        }
    }
}

val syncPeakData = tasks.register<SyncPeakData>("syncPeakData") {
    dataDir.set(rootProject.layout.projectDirectory.dir("../data"))
    outputDir.set(layout.buildDirectory.dir("generated/peakdata"))
}

extensions.getByType<ApplicationAndroidComponentsExtension>().onVariants { variant ->
    variant.sources.assets?.addGeneratedSourceDirectory(syncPeakData, SyncPeakData::outputDir)
}

tasks.withType<Test>().configureEach {
    // JVM tests read the same files the app ships.
    systemProperty("peak.data", rootProject.layout.projectDirectory.dir("../data").asFile.absolutePath)
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.kotlinx.serialization.json)
    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)

    testImplementation(libs.junit)
    testImplementation(libs.robolectric)
    testImplementation(platform(libs.compose.bom))
    testImplementation(libs.compose.ui.test.junit4)
}
