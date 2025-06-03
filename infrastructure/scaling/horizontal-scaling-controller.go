// SecureWatch Horizontal Scaling Controller
// Implements custom horizontal scaling logic with advanced metrics

package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"time"

	"k8s.io/api/apps/v1"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// HorizontalScalingController manages horizontal scaling for SecureWatch components
type HorizontalScalingController struct {
	client.Client
	Scheme    *runtime.Scheme
	ClientSet *kubernetes.Clientset
}

// ScalingMetrics represents custom metrics for scaling decisions
type ScalingMetrics struct {
	CPUUtilization    float64
	MemoryUtilization float64
	RequestRate       float64
	QueueDepth        int64
	ResponseTime      time.Duration
	ErrorRate         float64
}

// ScalingDecision represents the scaling decision with reasoning
type ScalingDecision struct {
	TargetReplicas int32
	Reason         string
	Confidence     float64
	Urgency        ScalingUrgency
}

type ScalingUrgency int

const (
	UrgencyLow ScalingUrgency = iota
	UrgencyMedium
	UrgencyHigh
	UrgencyCritical
)

// Reconcile implements the reconciliation logic for horizontal scaling
func (r *HorizontalScalingController) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log.Printf("Reconciling horizontal scaling for %s/%s", req.Namespace, req.Name)

	// Get the deployment
	var deployment v1.Deployment
	if err := r.Get(ctx, req.NamespacedName, &deployment); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Skip if deployment doesn't have scaling annotations
	if !r.shouldScale(&deployment) {
		return ctrl.Result{RequeueAfter: time.Minute * 5}, nil
	}

	// Collect metrics
	metrics, err := r.collectMetrics(ctx, &deployment)
	if err != nil {
		log.Printf("Failed to collect metrics: %v", err)
		return ctrl.Result{RequeueAfter: time.Minute * 2}, err
	}

	// Make scaling decision
	decision := r.makeScalingDecision(&deployment, metrics)

	// Apply scaling decision
	if err := r.applyScalingDecision(ctx, &deployment, decision); err != nil {
		log.Printf("Failed to apply scaling decision: %v", err)
		return ctrl.Result{RequeueAfter: time.Minute * 1}, err
	}

	// Determine requeue interval based on urgency
	requeueAfter := r.getRequeueInterval(decision.Urgency)
	return ctrl.Result{RequeueAfter: requeueAfter}, nil
}

// shouldScale determines if a deployment should be managed by this controller
func (r *HorizontalScalingController) shouldScale(deployment *v1.Deployment) bool {
	annotations := deployment.GetAnnotations()
	if annotations == nil {
		return false
	}

	enabled, exists := annotations["securewatch.io/horizontal-scaling"]
	return exists && enabled == "enabled"
}

// collectMetrics gathers various metrics for scaling decisions
func (r *HorizontalScalingController) collectMetrics(ctx context.Context, deployment *v1.Deployment) (*ScalingMetrics, error) {
	metrics := &ScalingMetrics{}

	// Get pods for the deployment
	pods, err := r.getDeploymentPods(ctx, deployment)
	if err != nil {
		return nil, fmt.Errorf("failed to get pods: %w", err)
	}

	// Collect CPU and Memory metrics
	if err := r.collectResourceMetrics(ctx, pods, metrics); err != nil {
		log.Printf("Failed to collect resource metrics: %v", err)
	}

	// Collect application-specific metrics
	if err := r.collectApplicationMetrics(ctx, deployment, metrics); err != nil {
		log.Printf("Failed to collect application metrics: %v", err)
	}

	// Collect queue depth metrics
	if err := r.collectQueueMetrics(ctx, deployment, metrics); err != nil {
		log.Printf("Failed to collect queue metrics: %v", err)
	}

	return metrics, nil
}

// getDeploymentPods retrieves pods for a given deployment
func (r *HorizontalScalingController) getDeploymentPods(ctx context.Context, deployment *v1.Deployment) ([]corev1.Pod, error) {
	var podList corev1.PodList
	
	labelSelector := client.MatchingLabels(deployment.Spec.Selector.MatchLabels)
	namespacedName := client.InNamespace(deployment.Namespace)

	if err := r.List(ctx, &podList, labelSelector, namespacedName); err != nil {
		return nil, err
	}

	return podList.Items, nil
}

// collectResourceMetrics gathers CPU and memory utilization
func (r *HorizontalScalingController) collectResourceMetrics(ctx context.Context, pods []corev1.Pod, metrics *ScalingMetrics) error {
	if len(pods) == 0 {
		return nil
	}

	var totalCPU, totalMemory float64
	podCount := 0

	for _, pod := range pods {
		if pod.Status.Phase != corev1.PodRunning {
			continue
		}

		// Get metrics from metrics server (simplified)
		podMetrics, err := r.getPodMetrics(ctx, pod.Namespace, pod.Name)
		if err != nil {
			continue
		}

		totalCPU += podMetrics.CPUUtilization
		totalMemory += podMetrics.MemoryUtilization
		podCount++
	}

	if podCount > 0 {
		metrics.CPUUtilization = totalCPU / float64(podCount)
		metrics.MemoryUtilization = totalMemory / float64(podCount)
	}

	return nil
}

// getPodMetrics retrieves metrics for a specific pod (simplified implementation)
func (r *HorizontalScalingController) getPodMetrics(ctx context.Context, namespace, name string) (*ScalingMetrics, error) {
	// In a real implementation, this would query the metrics server
	// For now, return mock data
	return &ScalingMetrics{
		CPUUtilization:    50.0 + (time.Now().Unix()%40-20), // Simulate 30-70% CPU
		MemoryUtilization: 60.0 + (time.Now().Unix()%30-15), // Simulate 45-75% Memory
	}, nil
}

// collectApplicationMetrics gathers application-specific metrics
func (r *HorizontalScalingController) collectApplicationMetrics(ctx context.Context, deployment *v1.Deployment, metrics *ScalingMetrics) error {
	// Get service for the deployment
	serviceName := deployment.Name
	service, err := r.ClientSet.CoreV1().Services(deployment.Namespace).Get(ctx, serviceName, metav1.GetOptions{})
	if err != nil {
		return err
	}

	// Query Prometheus or application metrics endpoint
	// This is a simplified implementation
	appMetrics := r.queryApplicationMetrics(service)
	metrics.RequestRate = appMetrics.RequestRate
	metrics.ResponseTime = appMetrics.ResponseTime
	metrics.ErrorRate = appMetrics.ErrorRate

	return nil
}

// queryApplicationMetrics queries application-specific metrics
func (r *HorizontalScalingController) queryApplicationMetrics(service *corev1.Service) *ScalingMetrics {
	// In a real implementation, this would query Prometheus or application endpoints
	// For now, return mock data based on time
	now := time.Now()
	return &ScalingMetrics{
		RequestRate:  100.0 + float64(now.Second()),
		ResponseTime: time.Duration(100+now.Second()) * time.Millisecond,
		ErrorRate:    0.01 + float64(now.Second()%10)/1000.0,
	}
}

// collectQueueMetrics gathers queue depth and processing metrics
func (r *HorizontalScalingController) collectQueueMetrics(ctx context.Context, deployment *v1.Deployment, metrics *ScalingMetrics) error {
	// Query queue systems like Kafka, RabbitMQ, etc.
	// This is a simplified implementation
	queueDepth := r.getQueueDepth(deployment)
	metrics.QueueDepth = queueDepth
	return nil
}

// getQueueDepth retrieves queue depth from messaging systems
func (r *HorizontalScalingController) getQueueDepth(deployment *v1.Deployment) int64 {
	// In a real implementation, this would query Kafka, RabbitMQ, etc.
	// For now, return mock data
	return int64(time.Now().Second() * 10)
}

// makeScalingDecision determines the optimal number of replicas
func (r *HorizontalScalingController) makeScalingDecision(deployment *v1.Deployment, metrics *ScalingMetrics) *ScalingDecision {
	currentReplicas := *deployment.Spec.Replicas
	
	// Get scaling parameters from annotations
	minReplicas := r.getAnnotationInt32(deployment, "securewatch.io/min-replicas", 2)
	maxReplicas := r.getAnnotationInt32(deployment, "securewatch.io/max-replicas", 20)
	targetCPU := r.getAnnotationFloat64(deployment, "securewatch.io/target-cpu", 70.0)
	targetMemory := r.getAnnotationFloat64(deployment, "securewatch.io/target-memory", 80.0)

	// Calculate desired replicas based on multiple factors
	cpuReplicas := r.calculateReplicasForCPU(currentReplicas, metrics.CPUUtilization, targetCPU)
	memoryReplicas := r.calculateReplicasForMemory(currentReplicas, metrics.MemoryUtilization, targetMemory)
	queueReplicas := r.calculateReplicasForQueue(currentReplicas, metrics.QueueDepth)
	responseTimeReplicas := r.calculateReplicasForResponseTime(currentReplicas, metrics.ResponseTime)

	// Use the highest recommendation (most conservative approach)
	targetReplicas := maxInt32(cpuReplicas, memoryReplicas, queueReplicas, responseTimeReplicas)
	
	// Apply constraints
	targetReplicas = maxInt32(minReplicas, minInt32(maxReplicas, targetReplicas))

	// Determine urgency and confidence
	urgency := r.calculateUrgency(metrics)
	confidence := r.calculateConfidence(metrics)
	reason := r.generateReason(metrics, cpuReplicas, memoryReplicas, queueReplicas, responseTimeReplicas)

	return &ScalingDecision{
		TargetReplicas: targetReplicas,
		Reason:         reason,
		Confidence:     confidence,
		Urgency:        urgency,
	}
}

// calculateReplicasForCPU determines replicas based on CPU utilization
func (r *HorizontalScalingController) calculateReplicasForCPU(current int32, utilization, target float64) int32 {
	if utilization <= 0 {
		return current
	}
	
	ratio := utilization / target
	desired := float64(current) * ratio
	
	// Apply smoothing to prevent oscillation
	if ratio > 1.1 {
		return int32(math.Ceil(desired))
	} else if ratio < 0.9 {
		return int32(math.Floor(desired))
	}
	
	return current
}

// calculateReplicasForMemory determines replicas based on memory utilization
func (r *HorizontalScalingController) calculateReplicasForMemory(current int32, utilization, target float64) int32 {
	if utilization <= 0 {
		return current
	}
	
	ratio := utilization / target
	desired := float64(current) * ratio
	
	// Memory scaling is more conservative
	if ratio > 1.05 {
		return int32(math.Ceil(desired))
	} else if ratio < 0.85 {
		return int32(math.Floor(desired))
	}
	
	return current
}

// calculateReplicasForQueue determines replicas based on queue depth
func (r *HorizontalScalingController) calculateReplicasForQueue(current int32, queueDepth int64) int32 {
	// Scale up if queue depth is high
	if queueDepth > 1000 {
		return current + int32(queueDepth/500)
	} else if queueDepth < 100 && current > 2 {
		return current - 1
	}
	
	return current
}

// calculateReplicasForResponseTime determines replicas based on response time
func (r *HorizontalScalingController) calculateReplicasForResponseTime(current int32, responseTime time.Duration) int32 {
	targetResponseTime := 200 * time.Millisecond
	
	if responseTime > targetResponseTime*2 {
		return current + 1
	} else if responseTime < targetResponseTime/2 && current > 2 {
		return current - 1
	}
	
	return current
}

// calculateUrgency determines how urgent the scaling action is
func (r *HorizontalScalingController) calculateUrgency(metrics *ScalingMetrics) ScalingUrgency {
	if metrics.CPUUtilization > 90 || metrics.MemoryUtilization > 95 || metrics.ErrorRate > 0.05 {
		return UrgencyCritical
	} else if metrics.CPUUtilization > 80 || metrics.MemoryUtilization > 85 || metrics.ResponseTime > 500*time.Millisecond {
		return UrgencyHigh
	} else if metrics.CPUUtilization > 70 || metrics.MemoryUtilization > 75 {
		return UrgencyMedium
	}
	
	return UrgencyLow
}

// calculateConfidence determines confidence in the scaling decision
func (r *HorizontalScalingController) calculateConfidence(metrics *ScalingMetrics) float64 {
	confidence := 0.5 // Base confidence
	
	// Increase confidence based on consistent metrics
	if metrics.CPUUtilization > 0 {
		confidence += 0.2
	}
	if metrics.MemoryUtilization > 0 {
		confidence += 0.2
	}
	if metrics.RequestRate > 0 {
		confidence += 0.1
	}
	
	return math.Min(confidence, 1.0)
}

// generateReason creates a human-readable reason for the scaling decision
func (r *HorizontalScalingController) generateReason(metrics *ScalingMetrics, cpuReplicas, memoryReplicas, queueReplicas, responseTimeReplicas int32) string {
	return fmt.Sprintf("CPU: %.1f%% (target: %d replicas), Memory: %.1f%% (target: %d replicas), Queue: %d (target: %d replicas), Response: %v (target: %d replicas)",
		metrics.CPUUtilization, cpuReplicas,
		metrics.MemoryUtilization, memoryReplicas,
		metrics.QueueDepth, queueReplicas,
		metrics.ResponseTime, responseTimeReplicas)
}

// applyScalingDecision applies the scaling decision to the deployment
func (r *HorizontalScalingController) applyScalingDecision(ctx context.Context, deployment *v1.Deployment, decision *ScalingDecision) error {
	currentReplicas := *deployment.Spec.Replicas
	
	if currentReplicas == decision.TargetReplicas {
		log.Printf("No scaling needed for %s/%s (current: %d, target: %d)",
			deployment.Namespace, deployment.Name, currentReplicas, decision.TargetReplicas)
		return nil
	}

	log.Printf("Scaling %s/%s from %d to %d replicas (confidence: %.2f, urgency: %v). Reason: %s",
		deployment.Namespace, deployment.Name, currentReplicas, decision.TargetReplicas,
		decision.Confidence, decision.Urgency, decision.Reason)

	// Update the deployment replica count
	deployment.Spec.Replicas = &decision.TargetReplicas
	
	// Add scaling annotation for audit trail
	if deployment.Annotations == nil {
		deployment.Annotations = make(map[string]string)
	}
	deployment.Annotations["securewatch.io/last-scaling"] = time.Now().Format(time.RFC3339)
	deployment.Annotations["securewatch.io/scaling-reason"] = decision.Reason
	deployment.Annotations["securewatch.io/scaling-confidence"] = fmt.Sprintf("%.2f", decision.Confidence)

	return r.Update(ctx, deployment)
}

// getRequeueInterval determines how often to check for scaling needs
func (r *HorizontalScalingController) getRequeueInterval(urgency ScalingUrgency) time.Duration {
	switch urgency {
	case UrgencyCritical:
		return 30 * time.Second
	case UrgencyHigh:
		return 1 * time.Minute
	case UrgencyMedium:
		return 2 * time.Minute
	default:
		return 5 * time.Minute
	}
}

// Helper functions
func (r *HorizontalScalingController) getAnnotationInt32(deployment *v1.Deployment, key string, defaultValue int32) int32 {
	annotations := deployment.GetAnnotations()
	if annotations == nil {
		return defaultValue
	}
	
	if value, exists := annotations[key]; exists {
		if parsed, err := fmt.Sscanf(value, "%d", &defaultValue); err == nil && parsed == 1 {
			return defaultValue
		}
	}
	
	return defaultValue
}

func (r *HorizontalScalingController) getAnnotationFloat64(deployment *v1.Deployment, key string, defaultValue float64) float64 {
	annotations := deployment.GetAnnotations()
	if annotations == nil {
		return defaultValue
	}
	
	if value, exists := annotations[key]; exists {
		if parsed, err := fmt.Sscanf(value, "%f", &defaultValue); err == nil && parsed == 1 {
			return defaultValue
		}
	}
	
	return defaultValue
}

func maxInt32(a, b ...int32) int32 {
	max := a
	for _, v := range b {
		if v > max {
			max = v
		}
	}
	return max
}

func minInt32(a, b int32) int32 {
	if a < b {
		return a
	}
	return b
}

// SetupWithManager sets up the controller with the Manager
func (r *HorizontalScalingController) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1.Deployment{}).
		Complete(r)
}

func main() {
	log.Println("Starting SecureWatch Horizontal Scaling Controller")

	// Get in-cluster config
	config, err := rest.InClusterConfig()
	if err != nil {
		log.Fatalf("Failed to get in-cluster config: %v", err)
	}

	// Create clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Fatalf("Failed to create clientset: %v", err)
	}

	// Setup manager
	mgr, err := ctrl.NewManager(config, ctrl.Options{
		Scheme:           runtime.NewScheme(),
		LeaderElection:   true,
		LeaderElectionID: "securewatch-scaling-controller",
	})
	if err != nil {
		log.Fatalf("Failed to create manager: %v", err)
	}

	// Setup controller
	controller := &HorizontalScalingController{
		Client:    mgr.GetClient(),
		Scheme:    mgr.GetScheme(),
		ClientSet: clientset,
	}

	if err := controller.SetupWithManager(mgr); err != nil {
		log.Fatalf("Failed to setup controller: %v", err)
	}

	log.Println("Starting manager")
	if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
		log.Fatalf("Manager exited with error: %v", err)
	}
}