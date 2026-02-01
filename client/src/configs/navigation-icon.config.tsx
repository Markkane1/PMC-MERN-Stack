import TablerIcon from '@/components/shared/TablerIcon'

export type NavigationIcons = Record<string, JSX.Element>

const navigationIcon: NavigationIcons = {
    home: <TablerIcon name="home" />,
    singleMenu: <TablerIcon name="acorn" />,
    collapseMenu: <TablerIcon name="arrows-in" />,
    groupSingleMenu: <TablerIcon name="book-2" />,
    groupCollapseMenu: <TablerIcon name="bookmark" />,
    groupMenu: <TablerIcon name="shopping-bag" />,
    FaUserPlus: <TablerIcon name="user-plus" />,
    MdDownload: <TablerIcon name="download" />,
    MdOutlineTrackChanges: <TablerIcon name="target" />,
    FaTools: <TablerIcon name="tools" />,
    FaClipboardList: <TablerIcon name="clipboard-list" />,
    MdReportProblem: <TablerIcon name="alert-triangle" />,
    MdDashboard: <TablerIcon name="layout-dashboard" />,
    FaDatabase: <TablerIcon name="database" />,
    FaAddressBook: <TablerIcon name="address-book" />,
    MdRecycling: <TablerIcon name="recycle" />,
    FaChartLine: <TablerIcon name="chart-line" />,
    MdAnalytics: <TablerIcon name="chart-bar" />,
    MdFactCheck: <TablerIcon name="checklist" />,
    MdAssignmentTurnedIn: <TablerIcon name="clipboard-check" />,
    FaUserShield: <TablerIcon name="shield" />,
    HiOutlineDocumentText: <TablerIcon name="file-text" />,
    MdSecurity: <TablerIcon name="shield-lock" />,
}

export default navigationIcon
