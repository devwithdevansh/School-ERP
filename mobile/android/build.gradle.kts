allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

// Force a newer compileSdk on plugin modules (e.g. audioplayers_android compiles against 33).
subprojects {
    if (state.executed) return@subprojects
    afterEvaluate {
        extensions.findByType(com.android.build.gradle.LibraryExtension::class.java)?.compileSdk = 36
    }
}
