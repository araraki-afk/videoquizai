import { useState } from 'react'
import '../styles/pages.css'

export default function Groups() {
  const [groups, setGroups] = useState([
    {
      id: 1,
      name: 'Class 10A - Section A',
      students: 32,
      description: 'Primary science and mathematics group',
      role: 'member',
      joined: '3 months ago'
    },
    {
      id: 2,
      name: 'Class 10A - Section B',
      students: 28,
      description: 'Advanced English literature',
      role: 'admin',
      joined: '2 months ago'
    },
    {
      id: 3,
      name: 'Math Club',
      students: 45,
      description: 'For mathematics enthusiasts',
      role: 'member',
      joined: '1 month ago'
    },
    {
      id: 4,
      name: 'Science Explorers',
      students: 38,
      description: 'Experimental science projects',
      role: 'member',
      joined: '1 week ago'
    }
  ])

  const [selectedGroup, setSelectedGroup] = useState(null)

  return (
    <div className="groups-container">
      <header className="groups-header">
        <div>
          <h1>Groups 👥</h1>
          <p>Manage your class groups and collaborate with peers</p>
        </div>
        <button className="btn btn-primary">Create Group</button>
      </header>

      <div className="groups-layout">
        <div className="groups-list">
          {groups.map(group => (
            <GroupListItem
              key={group.id}
              group={group}
              isSelected={selectedGroup?.id === group.id}
              onSelect={() => setSelectedGroup(group)}
            />
          ))}
        </div>

        {selectedGroup && (
          <div className="group-details">
            <GroupDetail group={selectedGroup} />
          </div>
        )}
      </div>
    </div>
  )
}

function GroupListItem({ group, isSelected, onSelect }) {
  return (
    <div
      className={`group-item ${isSelected ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div className="group-item-header">
        <h3>{group.name}</h3>
        <span className={`role-badge role-${group.role}`}>
          {group.role}
        </span>
      </div>
      <p className="group-description">{group.description}</p>
      <div className="group-item-footer">
        <span className="student-count">👥 {group.students} members</span>
        <span className="joined-date">Joined {group.joined}</span>
      </div>
    </div>
  )
}

function GroupDetail({ group }) {
  const [activeTab, setActiveTab] = useState('members')

  const members = [
    { id: 1, name: 'Alice Johnson', email: 'alice@school.com', joined: '3 months ago', role: 'member' },
    { id: 2, name: 'Bob Smith', email: 'bob@school.com', joined: '3 months ago', role: 'member' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@school.com', joined: '2 months ago', role: 'member' },
    { id: 4, name: 'Diana Prince', email: 'diana@school.com', joined: '1 month ago', role: 'member' }
  ]

  const resources = [
    { id: 1, name: 'Chapter 1 - Introduction', type: 'PDF', uploadedBy: 'Teacher', date: '1 week ago' },
    { id: 2, name: 'Study Guide', type: 'Document', uploadedBy: 'Teacher', date: '3 days ago' },
    { id: 3, name: 'Practice Problems', type: 'PDF', uploadedBy: 'Admin', date: 'Yesterday' }
  ]

  const announcements = [
    { id: 1, title: 'Final exam on next Monday', author: 'Teacher', date: '2 days ago', content: 'The final exam will be held on Monday at 9 AM. Please arrive 15 minutes early.' },
    { id: 2, title: 'Group assignment due', author: 'Admin', date: '3 days ago', content: 'The group project is due by Friday. Submit through the portal.' }
  ]

  return (
    <div className="group-detail-card">
      <div className="group-detail-header">
        <div>
          <h2>{group.name}</h2>
          <p>{group.description}</p>
        </div>
        <div className="group-stats">
          <div className="stat">
            <span className="stat-value">{group.students}</span>
            <span className="stat-label">Members</span>
          </div>
          <div className="stat">
            <span className="stat-value">12</span>
            <span className="stat-label">Resources</span>
          </div>
        </div>
      </div>

      <div className="detail-tabs">
        <button
          className={`tab-button ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members
        </button>
        <button
          className={`tab-button ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          Resources
        </button>
        <button
          className={`tab-button ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          Announcements
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'members' && (
          <div className="members-list">
            {members.map(member => (
              <div key={member.id} className="member-item">
                <div className="member-avatar">👤</div>
                <div className="member-info">
                  <p className="member-name">{member.name}</p>
                  <p className="member-email">{member.email}</p>
                </div>
                <div className="member-details">
                  <span className="member-role">{member.role}</span>
                  <span className="member-joined">{member.joined}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="resources-list">
            {resources.map(resource => (
              <div key={resource.id} className="resource-item">
                <div className="resource-icon">📄</div>
                <div className="resource-info">
                  <p className="resource-name">{resource.name}</p>
                  <p className="resource-meta">{resource.type} • by {resource.uploadedBy}</p>
                </div>
                <span className="resource-date">{resource.date}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="announcements-list">
            {announcements.map(announcement => (
              <div key={announcement.id} className="announcement-item">
                <h4>{announcement.title}</h4>
                <p className="announcement-meta">by {announcement.author} • {announcement.date}</p>
                <p className="announcement-content">{announcement.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
