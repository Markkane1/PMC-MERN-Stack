// Test user fixtures
export const testUsers = {
    user: {
        email: 'testuser@example.com',
        password: 'password123',
        name: 'Test User',
        role: ['User'],
    },
    inspector: {
        email: 'inspector@example.com',
        password: 'password123',
        name: 'Inspector User',
        role: ['Inspector'],
    },
    admin: {
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: ['Admin', 'Super'],
    },
    deo: {
        email: 'deo@example.com',
        password: 'password123',
        name: 'DEO User',
        role: ['DEO'],
    },
}

// Mock API responses
export const mockPaymentResponse = {
    applicantId: 'APP-2024-001',
    status: 'pending',
    amount: 5000,
    currency: 'PKR',
    dueDate: '2024-12-31',
    breakdown: [
        { item: 'Registration Fee', amount: 2000 },
        { item: 'Processing Fee', amount: 3000 },
    ],
    paymentMethods: [
        { method: 'Bank Transfer', accountNumber: '1234567890' },
        { method: 'Online', url: 'https://payment.example.com' },
    ],
}

export const mockApplicationResponse = {
    applicantId: 'APP-2024-001',
    currentStep: 'personal',
    status: 'draft',
    formData: {
        personal: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+92-300-1234567',
        },
        details: {
            organization: 'Test Organization',
            district: 'Lahore',
            type: 'facility',
        },
    },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
}

export const mockNotificationsResponse = {
    data: [
        {
            id: '1',
            title: 'Application Status Update',
            message: 'Your application has been approved',
            priority: 'high',
            read: false,
            createdAt: '2024-01-20T08:15:00Z',
        },
        {
            id: '2',
            title: 'Payment Reminder',
            message: 'Your payment is due on 2024-12-31',
            priority: 'medium',
            read: true,
            createdAt: '2024-01-19T10:30:00Z',
        },
    ],
    total: 2,
    unread: 1,
}

export const mockLocationsResponse = {
    data: [
        {
            id: '1',
            lat: 31.5497,
            lon: 74.3436,
            name: 'Facility A',
            type: 'facility',
            district: 'Lahore',
        },
        {
            id: '2',
            lat: 31.5600,
            lon: 74.3500,
            name: 'Violation Site B',
            type: 'violation',
            district: 'Lahore',
            intensity: 75,
        },
        {
            id: '3',
            lat: 31.5400,
            lon: 74.3350,
            name: 'Inspection C',
            type: 'inspection',
            district: 'Lahore',
        },
    ],
}

export const mockAnalyticsResponse = {
    data: [
        { month: 'Jan', inspections: 145, violations: 12, complaints: 5, resolved: 8 },
        { month: 'Feb', inspections: 178, violations: 15, complaints: 8, resolved: 12 },
        { month: 'Mar', inspections: 156, violations: 10, complaints: 4, resolved: 9 },
        { month: 'Apr', inspections: 189, violations: 18, complaints: 11, resolved: 16 },
        { month: 'May', inspections: 201, violations: 22, complaints: 14, resolved: 19 },
        { month: 'Jun', inspections: 234, violations: 28, complaints: 18, resolved: 25 },
    ],
}

export const mockLocationStatsResponse = {
    data: [
        {
            district: 'Lahore',
            facilities: 245,
            inspections: 892,
            violations: 34,
            complaints: 12,
            avgResponseTime: 4.2,
        },
        {
            district: 'Karachi',
            facilities: 198,
            inspections: 756,
            violations: 28,
            complaints: 8,
            avgResponseTime: 5.1,
        },
        {
            district: 'Islamabad',
            facilities: 87,
            inspections: 234,
            violations: 5,
            complaints: 2,
            avgResponseTime: 3.5,
        },
    ],
}
