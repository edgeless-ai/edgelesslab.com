import Foundation

/// Clusters faces across multiple photos into Person instances
/// Uses Hungarian algorithm for optimal face-to-person matching
actor FaceClusteringService {
    
    /// Minimum similarity score to consider two faces the same person
    private let similarityThreshold: Double = 0.75
    
    /// Weight for geometric fingerprinting (most reliable)
    private let geometricWeight = 0.70
    
    /// Weight for spatial position (same position in different photos = likely same person)
    private let spatialWeight = 0.20
    
    /// Weight for pose consistency (similar head angles)
    private let poseWeight = 0.10
    
    /// Cluster faces into people
    /// - Parameter faces: All detected faces across all photos
    /// - Returns: Array of Person (each with clustered faces)
    func cluster(faces: [Face]) async throws -> [Person] {
        // Filter low-confidence faces
        let validFaces = faces.filter { $0.confidence >= 0.7 }
        guard !validFaces.isEmpty else { return [] }
        
        // Group faces by photo
        let facesByPhoto = Dictionary(grouping: validFaces) { $0.photoId }
        let photoIds = Array(facesByPhoto.keys).sorted(by: { $0.uuidString < $1.uuidString })
        
        // Need at least 1 photo
        guard photoIds.count >= 1 else { return [] }
        
        // Single photo: each face is a separate person
        if photoIds.count == 1 {
            return validFaces.map { face in
                Person(
                    id: UUID(),
                    faces: [face],
                    selectedFaceId: face.id
                )
            }
        }
        
        // Start with faces from first photo as initial people
        var people = facesByPhoto[photoIds[0]]!.map { face in
            Person(
                id: UUID(),
                faces: [face],
                selectedFaceId: face.id
            )
        }
        
        // Match each subsequent photo's faces to existing people
        for photoId in photoIds.dropFirst() {
            guard let photoFaces = facesByPhoto[photoId] else { continue }
            
            // Build cost matrix (convert similarity to cost)
            let costMatrix = buildCostMatrix(people: people, faces: photoFaces)
            
            // Hungarian algorithm for optimal matching
            let assignments = hungarianAlgorithm(costMatrix: costMatrix)
            
            // Track which faces were assigned
            var assignedFaceIndices = Set<Int>()
            
            // Process assignments
            for (personIdx, faceIdx) in assignments {
                guard personIdx < people.count, faceIdx < photoFaces.count else { continue }
                
                let cost = costMatrix[personIdx][faceIdx]
                let similarity = 1.0 - cost
                
                if similarity >= similarityThreshold {
                    // Match found: add face to existing person
                    var person = people[personIdx]
                    person.faces.append(photoFaces[faceIdx])
                    people[personIdx] = person
                    assignedFaceIndices.insert(faceIdx)
                }
            }
            
            // Any unassigned faces become new people
            for (index, face) in photoFaces.enumerated() {
                if !assignedFaceIndices.contains(index) {
                    people.append(Person(
                        id: UUID(),
                        faces: [face],
                        selectedFaceId: face.id
                    ))
                }
            }
        }
        
        return people
    }
    
    /// Build cost matrix for Hungarian algorithm
    /// Returns matrix where cost = 1.0 - similarity (lower is better match)
    private func buildCostMatrix(people: [Person], faces: [Face]) -> [[Double]] {
        return people.map { person in
            faces.map { face in
                guard let personFace = person.faces.last else { return 1.0 }
                let sim = similarity(between: personFace, and: face)
                return 1.0 - sim // Convert to cost
            }
        }
    }
    
    /// Calculate overall similarity between two faces (0-1)
    /// Combines geometric, spatial, and pose factors
    private func similarity(between face1: Face, and face2: Face) -> Double {
        // Same photo = definitely different people
        if face1.photoId == face2.photoId {
            return 0.0
        }
        
        let geometricSim = geometricSimilarity(between: face1, and: face2)
        let spatialSim = spatialSimilarity(between: face1, and: face2)
        let poseSim = poseSimilarity(between: face1, and: face2)
        
        // Weighted combination
        return geometricSim * geometricWeight +
               spatialSim * spatialWeight +
               poseSim * poseWeight
    }
    
    /// Geometric similarity using facial landmark ratios (70% weight)
    /// These ratios are relatively invariant to pose changes
    private func geometricSimilarity(between face1: Face, and face2: Face) -> Double {
        let ratios1 = extractGeometricRatios(face1.landmarks)
        let ratios2 = extractGeometricRatios(face2.landmarks)
        
        // Compare using normalized Manhattan distance
        let diffs = zip(ratios1, ratios2).map { abs($0 - $1) }
        let totalDiff = diffs.reduce(0, +)
        
        // Normalize by number of ratios and max expected difference
        let normalizedDiff = totalDiff / Double(ratios1.count)
        return max(0.0, 1.0 - normalizedDiff * 2.0) // Scale factor for sensitivity
    }
    
    /// Extract geometric ratios from landmarks
    /// Returns array of normalized distance ratios
    private func extractGeometricRatios(_ landmarks: FaceLandmarks?) -> [Double] {
        guard let landmarks = landmarks,
              let leftEye = landmarks.leftEye, leftEye.count >= 2,
              let rightEye = landmarks.rightEye, rightEye.count >= 2 else {
            return [0.5, 0.5, 0.5, 0.5, 0.5] // Default neutral ratios
        }
        
        // Calculate key points
        let leftEyeCenter = CGPoint(
            x: leftEye.map { $0.x }.reduce(0, +) / CGFloat(leftEye.count),
            y: leftEye.map { $0.y }.reduce(0, +) / CGFloat(leftEye.count)
        )
        let rightEyeCenter = CGPoint(
            x: rightEye.map { $0.x }.reduce(0, +) / CGFloat(rightEye.count),
            y: rightEye.map { $0.y }.reduce(0, +) / CGFloat(rightEye.count)
        )
        
        // Inter-ocular distance (reference for normalization)
        let interOcular = distance(leftEyeCenter, rightEyeCenter)
        guard interOcular > 0 else { return [0.5, 0.5, 0.5, 0.5, 0.5] }
        
        var ratios: [Double] = []
        
        // 1. Eye width ratios
        let leftEyeWidth = distance(leftEye[0], leftEye[leftEye.count - 1])
        let rightEyeWidth = distance(rightEye[0], rightEye[rightEye.count - 1])
        ratios.append(Double(leftEyeWidth / interOcular))
        ratios.append(Double(rightEyeWidth / interOcular))
        
        // 2. Face contour width / inter-ocular
        if let contour = landmarks.faceContour, contour.count >= 2 {
            let faceWidth = distance(contour.first!, contour.last!)
            ratios.append(Double(faceWidth / interOcular))
        } else {
            ratios.append(1.5) // Default estimate
        }
        
        // 3. Nose length / inter-ocular (if available)
        if let nose = landmarks.nose, nose.count >= 2 {
            let noseTop = nose.first!
            let noseBottom = nose.last!
            let noseLength = distance(noseTop, noseBottom)
            ratios.append(Double(noseLength / interOcular))
        } else {
            ratios.append(0.5) // Default
        }
        
        // 4. Eye-to-nose distance / inter-ocular
        if let nose = landmarks.nose, let noseCenter = nose.first {
            let eyeToNose = distance(leftEyeCenter, noseCenter)
            ratios.append(Double(eyeToNose / interOcular))
        } else {
            ratios.append(0.4) // Default
        }
        
        return ratios
    }
    
    /// Spatial similarity using bounding box position (20% weight)
    /// Faces in similar relative positions across photos are likely same person
    private func spatialSimilarity(between face1: Face, and face2: Face) -> Double {
        let dx = abs(face1.boundingBox.midX - face2.boundingBox.midX)
        let dy = abs(face1.boundingBox.midY - face2.boundingBox.midY)
        let distance = sqrt(dx * dx + dy * dy)
        
        // Gaussian falloff: closer = higher similarity
        // 0.0 distance = 1.0 similarity, 0.5 distance = ~0.08 similarity
        return exp(-distance * distance * 5.0)
    }
    
    /// Pose similarity using head angles (10% weight)
    /// Similar roll/pitch/yaw suggests same person
    private func poseSimilarity(between face1: Face, and face2: Face) -> Double {
        let rollDiff = abs(face1.roll - face2.roll)
        let pitchDiff = abs(face1.pitch - face2.pitch)
        let yawDiff = abs(face1.yaw - face2.yaw)
        
        let totalDiff = rollDiff + pitchDiff + yawDiff
        // Normalize: typical face angles are within ±0.5 radians
        // Total max diff = 3 * π ≈ 9.42, but practically smaller
        return max(0.0, 1.0 - totalDiff / 2.0)
    }
    
    /// Calculate Euclidean distance between two points
    private func distance(_ p1: CGPoint, _ p2: CGPoint) -> CGFloat {
        let dx = p1.x - p2.x
        let dy = p1.y - p2.y
        return sqrt(dx * dx + dy * dy)
    }
}

// MARK: - Hungarian Algorithm (Kuhn-Munkres)

extension FaceClusteringService {
    
    /// Hungarian algorithm for optimal bipartite matching
    /// Solves assignment problem: minimize total cost across all assignments
    /// - Parameter costMatrix: n x m matrix of costs (can be rectangular)
    /// - Returns: Array of (row, col) pairs representing optimal assignments
    private func hungarianAlgorithm(costMatrix: [[Double]]) -> [(row: Int, col: Int)] {
        guard !costMatrix.isEmpty && !costMatrix[0].isEmpty else { return [] }
        
        let n = costMatrix.count
        let m = costMatrix[0].count
        let size = max(n, m)
        
        // Square the matrix with padding (large cost for dummy entries)
        let maxCost = costMatrix.flatMap { $0 }.max() ?? 1.0
        let paddingCost = maxCost * 2.0 + 1.0
        
        var matrix = Array(repeating: Array(repeating: paddingCost, count: size), count: size)
        for i in 0..<n {
            for j in 0..<m {
                matrix[i][j] = costMatrix[i][j]
            }
        }
        
        // Arrays for algorithm state
        var u = Array(repeating: 0.0, count: size + 1)
        var v = Array(repeating: 0.0, count: size + 1)
        var p = Array(repeating: 0, count: size + 1) // Matching for columns
        var way = Array(repeating: 0, count: size + 1)
        
        // Build matching row by row
        for i in 1...size {
            p[0] = i
            var j0 = 0
            var minV = Array(repeating: Double.infinity, count: size + 1)
            var used = Array(repeating: false, count: size + 1)
            
            repeat {
                used[j0] = true
                let i0 = p[j0]
                var delta = Double.infinity
                var j1 = 0
                
                for j in 1...size {
                    if !used[j] {
                        let cur = matrix[i0 - 1][j - 1] - u[i0] - v[j]
                        if cur < minV[j] {
                            minV[j] = cur
                            way[j] = j0
                        }
                        if minV[j] < delta {
                            delta = minV[j]
                            j1 = j
                        }
                    }
                }
                
                for j in 0...size {
                    if used[j] {
                        u[p[j]] += delta
                        v[j] -= delta
                    } else {
                        minV[j] -= delta
                    }
                }
                
                j0 = j1
            } while p[j0] != 0
            
            // Augmenting path
            repeat {
                let j1 = way[j0]
                p[j0] = p[j1]
                j0 = j1
            } while j0 != 0
        }
        
        // Build result (only for original matrix dimensions)
        var result: [(row: Int, col: Int)] = []
        for j in 1...size {
            if p[j] > 0 && p[j] <= n && j <= m {
                result.append((row: p[j] - 1, col: j - 1))
            }
        }
        
        return result
    }
}