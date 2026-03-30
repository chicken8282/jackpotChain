pipeline {
    agent any

    options {
        disableConcurrentBuilds()
    }

    environment {
        DOCKERHUB_REPO    = "jooyoonjang"
        DOCKER_IMAGE_BE   = "jackpotchain-be"
        DOCKER_IMAGE_FE   = "jackpotchain-fe"
        DOCKER_IMAGE_NODE = "jackpotchain-node"

        MAIN_EC2        = "ubuntu@15.165.75.53"
        REMOTE_REPO_DIR = "~/deploy-repo"
        REMOTE_APP_DIR  = "~/app"

        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Determine Branch') {
            steps {
                script {
                    def detectedBranch = ""

                    if (env.gitlabBranch) {
                        detectedBranch = env.gitlabBranch.tokenize('/').last()
                    } else if (env.BRANCH_NAME) {
                        detectedBranch = env.BRANCH_NAME
                    } else if (env.GIT_BRANCH) {
                        detectedBranch = env.GIT_BRANCH.tokenize('/').last()
                    } else {
                        detectedBranch = sh(
                            script: "git rev-parse --abbrev-ref HEAD",
                            returnStdout: true
                        ).trim()
                    }

                    env.CURRENT_BRANCH = detectedBranch
                    echo "감지된 브랜치: ${env.CURRENT_BRANCH}"

                    if (env.CURRENT_BRANCH == 'develop') {
                        env.DEPLOY_TARGET = 'dev'
                        echo "개발 환경 배포로 진행합니다."
                    } else if (env.CURRENT_BRANCH == 'master' || env.CURRENT_BRANCH == 'main') {
                        env.DEPLOY_TARGET = 'prod'
                        echo "운영 환경 배포로 진행합니다."
                    } else {
                        error "배포 가능한 브랜치가 아닙니다: ${env.CURRENT_BRANCH}"
                    }
                }
            }
        }

        stage('Build Backend') {
            steps {
                dir('BE-ssatto') {
                    sh './gradlew clean build -x test'
                }
            }
        }

        stage('Docker Login') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                }
            }
        }

        stage('Build & Push Images') {
            steps {
                withCredentials([string(credentialsId: 'gms-api-key', variable: 'GMS_API_KEY')]) {
                    sh """
                    docker build -t ${DOCKERHUB_REPO}/${DOCKER_IMAGE_BE}:${IMAGE_TAG} ./BE-ssatto
                    docker build \\
                        --build-arg VITE_GMS_API_KEY=\${GMS_API_KEY} \\
                        -t ${DOCKERHUB_REPO}/${DOCKER_IMAGE_FE}:${IMAGE_TAG} \\
                        ./FE-ssatto
                    docker build -t ${DOCKERHUB_REPO}/${DOCKER_IMAGE_NODE}:${IMAGE_TAG} ./blockchain

                    docker push ${DOCKERHUB_REPO}/${DOCKER_IMAGE_BE}:${IMAGE_TAG}
                    docker push ${DOCKERHUB_REPO}/${DOCKER_IMAGE_FE}:${IMAGE_TAG}
                    docker push ${DOCKERHUB_REPO}/${DOCKER_IMAGE_NODE}:${IMAGE_TAG}
                    """
                }
            }
        }

        stage('Deploy Dev') {
            when {
                expression { env.DEPLOY_TARGET == 'dev' }
            }
            steps {
                sshagent(['main-ec2-ssh']) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ${MAIN_EC2} '
                        set -e

                        cd ${REMOTE_REPO_DIR}
                        git fetch origin
                        git checkout develop
                        git pull origin develop

                        mkdir -p ${REMOTE_APP_DIR}/compose
                        mkdir -p ${REMOTE_APP_DIR}/scripts
                        mkdir -p ${REMOTE_APP_DIR}/monitoring/prometheus
                        mkdir -p ${REMOTE_APP_DIR}/monitoring/loki
                        mkdir -p ${REMOTE_APP_DIR}/monitoring/promtail
                        mkdir -p ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/datasources
                        mkdir -p ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/dashboards
                        mkdir -p ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/alerting

                        cp ${REMOTE_REPO_DIR}/docker-compose.dev.yml ${REMOTE_APP_DIR}/compose/
                        cp ${REMOTE_REPO_DIR}/docker-compose.prod.yml ${REMOTE_APP_DIR}/compose/
                        cp ${REMOTE_REPO_DIR}/docker-compose.monitoring.yml ${REMOTE_APP_DIR}/compose/

                        cp ${REMOTE_REPO_DIR}/scripts/*.sh ${REMOTE_APP_DIR}/scripts/
                        chmod +x ${REMOTE_APP_DIR}/scripts/*.sh

                        cp ${REMOTE_REPO_DIR}/monitoring/prometheus/prometheus.yml ${REMOTE_APP_DIR}/monitoring/prometheus/
                        cp ${REMOTE_REPO_DIR}/monitoring/loki/config.yml ${REMOTE_APP_DIR}/monitoring/loki/
                        cp ${REMOTE_REPO_DIR}/monitoring/promtail/config.yml ${REMOTE_APP_DIR}/monitoring/promtail/
                        cp ${REMOTE_REPO_DIR}/monitoring/grafana/provisioning/datasources/datasources.yml ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/datasources/
                        cp ${REMOTE_REPO_DIR}/monitoring/grafana/provisioning/dashboards/dashboard.yml ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/dashboards/
                        cp ${REMOTE_REPO_DIR}/monitoring/grafana/provisioning/dashboards/spring-overview.json ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/dashboards/
                        cp ${REMOTE_REPO_DIR}/monitoring/grafana/provisioning/dashboards/loki-logs.json ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/dashboards/
                        cp ${REMOTE_REPO_DIR}/monitoring/grafana/provisioning/alerting/rules.yml ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/alerting/
                        cp ${REMOTE_REPO_DIR}/monitoring/grafana/provisioning/alerting/contact_points.yml ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/alerting/
                        cp ${REMOTE_REPO_DIR}/monitoring/grafana/provisioning/alerting/notification_policies.yml ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/alerting/

                        sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${IMAGE_TAG}/" ${REMOTE_APP_DIR}/env/.env.dev

                        bash ${REMOTE_APP_DIR}/scripts/deploy-dev.sh
                    '
                    """
                }
            }
        }

        stage('Deploy Green') {
            when {
                expression { env.DEPLOY_TARGET == 'prod' }
            }
            steps {
                sshagent(['main-ec2-ssh']) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ${MAIN_EC2} '
                        set -e

                        cd ${REMOTE_REPO_DIR}
                        git fetch origin
                        git checkout ${CURRENT_BRANCH}
                        git pull origin ${CURRENT_BRANCH}

                        mkdir -p ${REMOTE_APP_DIR}/compose
                        mkdir -p ${REMOTE_APP_DIR}/scripts
                        mkdir -p ${REMOTE_APP_DIR}/monitoring/prometheus
                        mkdir -p ${REMOTE_APP_DIR}/monitoring/loki
                        mkdir -p ${REMOTE_APP_DIR}/monitoring/promtail
                        mkdir -p ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/datasources
                        mkdir -p ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/dashboards
                        mkdir -p ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/alerting

                        cp ${REMOTE_REPO_DIR}/docker-compose.dev.yml ${REMOTE_APP_DIR}/compose/
                        cp ${REMOTE_REPO_DIR}/docker-compose.prod.yml ${REMOTE_APP_DIR}/compose/
                        cp ${REMOTE_REPO_DIR}/docker-compose.monitoring.yml ${REMOTE_APP_DIR}/compose/

                        cp ${REMOTE_REPO_DIR}/scripts/*.sh ${REMOTE_APP_DIR}/scripts/
                        chmod +x ${REMOTE_APP_DIR}/scripts/*.sh

                        cp ${REMOTE_REPO_DIR}/monitoring/prometheus/prometheus.yml ${REMOTE_APP_DIR}/monitoring/prometheus/
                        cp ${REMOTE_REPO_DIR}/monitoring/loki/config.yml ${REMOTE_APP_DIR}/monitoring/loki/
                        cp ${REMOTE_REPO_DIR}/monitoring/promtail/config.yml ${REMOTE_APP_DIR}/monitoring/promtail/
                        cp ${REMOTE_REPO_DIR}/monitoring/grafana/provisioning/datasources/datasources.yml ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/datasources/
                        cp ${REMOTE_REPO_DIR}/monitoring/grafana/provisioning/dashboards/dashboard.yml ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/dashboards/
                        cp ${REMOTE_REPO_DIR}/monitoring/grafana/provisioning/dashboards/spring-overview.json ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/dashboards/
                        cp ${REMOTE_REPO_DIR}/monitoring/grafana/provisioning/dashboards/loki-logs.json ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/dashboards/
                        cp ${REMOTE_REPO_DIR}/monitoring/grafana/provisioning/alerting/rules.yml ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/alerting/
                        cp ${REMOTE_REPO_DIR}/monitoring/grafana/provisioning/alerting/contact_points.yml ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/alerting/
                        cp ${REMOTE_REPO_DIR}/monitoring/grafana/provisioning/alerting/notification_policies.yml ${REMOTE_APP_DIR}/monitoring/grafana/provisioning/alerting/

                        sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${IMAGE_TAG}/" ${REMOTE_APP_DIR}/env/.env.prod

                        bash ${REMOTE_APP_DIR}/scripts/deploy-prod.sh green
                    '
                    """
                }
            }
        }
    }

    post {
        success {
            echo "배포 파이프라인이 성공적으로 완료되었습니다."
        }
        failure {
            echo "배포 파이프라인이 실패했습니다. Jenkins 로그와 원격 서버 로그를 확인하세요."
        }
        always {
            sh 'docker logout || true'
        }
    }
}