import React, { useState } from 'react'
import Tabs from '@/components/ui/Tabs'
import TablerIcon from '@/components/shared/TablerIcon'
import DocumentsTab from './DocumentsTab'
import { useSessionUser } from '@/store/authStore'

const { TabNav, TabList, TabContent } = Tabs

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('tab1')
    const district_id =
        useSessionUser((state) => state.user.district_id) || null
    const district_name =
        useSessionUser((state) => state.user.district_name) || ''

    return (
        <div>
            <Tabs value={activeTab} onChange={setActiveTab}>
                <TabList>
                    <TabNav value="tab1" icon={<TablerIcon name="file-text" />}>
                        Manage Documents for District: {district_name}
                    </TabNav>
                </TabList>

                <div className="p-4">
                    <TabContent value="tab1">
                        <DocumentsTab />
                    </TabContent>
                </div>
            </Tabs>
        </div>
    )
}

export default Dashboard
