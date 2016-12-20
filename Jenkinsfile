import groovy.json.JsonSlurperClassic

def runPipeline() {
    try {
        runStages();
    } catch(err) {
        echo "Error: ${err}"
        currentBuild.result = "FAILED"
    }
}

def buildDockerfile(dockerfilePath = "Dockerfile", imageName) {
    def buildCmd = "docker build -f ${dockerfilePath} -t ${imageName} ."
    echo "${buildCmd}"

    def result = sh(script: buildCmd, returnStatus: true)

    if (result != 0) {
        throw new Exception("Failed to build image[${imageName}] from '${dockerfilePath}'")
    }
}

def runCmdOnDockerImage(imageName, cmd) {
    def result = sh(script: "docker run --net=host -i ${imageName} sh -c '${cmd}'", returnStatus: true)

    if(result != 0) {
        throw new Exception("Failed to run cmd[${cmd}] on image[${imageName}]")
    }
}

def calculateGithubInfo() {
    return [
        branch: env.BRANCH_NAME,
        sha: sh(returnStdout: true, script: 'git rev-parse HEAD').trim(),
        tag: null,
        isPR: "${env.CHANGE_URL}".contains('/pull/')
    ]
}

def runStages() {
    def buildInfo = [
        image: [
            name: "normanjoyner/react-native",
            tag: null
        ],
        scm: [
            branch: null,
            sha: null,
            tag: null,
            isPR: false
        ]
    ]

    node {
        try {
            stage('Build') {
                checkout scm

                def githubInfo = calculateGithubInfo()
                buildInfo.scm.branch = githubInfo.branch
                buildInfo.scm.sha = githubInfo.sha
                buildInfo.scm.tag = githubInfo.tag
                buildInfo.scm.isPR = githubInfo.isPR
                buildInfo.image.tag = buildInfo.scm.sha

                buildDockerfile('Dockerfile', "${buildInfo.image.name}:${buildInfo.image.tag}")
            }

            stage('Test') {
                parallel(
                    flow: {
                        runCmdOnDockerImage("${buildInfo.image.name}:${buildInfo.image.tag}", 'yarn run flow check')
                    },
                    test: {
                        runCmdOnDockerImage("${buildInfo.image.name}:${buildInfo.image.tag}", 'yarn test --maxWorkers=4')
                    }
                )
            }

            stage('Cleanup') {
                cleanupImage(buildInfo.image.name, buildInfo.image.tag)
            }
        } catch(err) {
            cleanupImage(buildInfo.image.name, buildInfo.image.tag)
            throw err
        }
    }

}

def isMasterBranch() {
    return env.GIT_BRANCH == 'master'
}

def gitCommit() {
    return sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
}

def cleanupImage(imageName, tag) {
    def imageId = sh(script: "docker images | awk '\$1==\"${imageName}\" && \$2==\"${tag}\" { print \$3 }'", returnStdout: true).trim()

    if(imageId) {
        sh "docker rm -f \$(docker ps -a | awk '\$2==\"${imageName}:${tag}\" { print \$1 }')"
        sh "docker rmi -f ${imageId}"
    }
}

runPipeline()
