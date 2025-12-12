pipeline {
 agent any // Runs on any available agent
 stages {
 stage('Build') {
 steps {
 echo "Building the project..."
 sh 'ls -la' // Linux/macOS command
 // For Windows: bat 'dir'
 }
 }
 stage('Test') {
 steps {
 echo "Running tests..."
 }
 }
 stage('Deploy') {
 steps {
 echo "Deploying..."
 }
 }
 }
}