# SE3090 ASSIGNMENT 1 | GUIDANCE-ONLY EXAMPLE

## Intelligent Vehicle Service and Maintenance Management System

### AutoCare AI - Integrated Full-Stack and Agentic AI Application

> **IMPORTANT - SAMPLE ONLY**
> This scenario is provided only to help students understand how the assignment requirements can be combined into one integrated application. Students may not select, reproduce, adapt closely or submit this AutoCare AI scenario as their assignment project. Each group must propose a different and original real-world problem and solution.

---

## Real-world problem

Many vehicle service centres manage service requests, technician schedules, spare parts, inspections and quotations manually or through disconnected systems. This can result in appointment conflicts, unavailable spare parts, delayed services and poor customer communication.

AutoCare AI provides one integrated system where customers request vehicle services through a Flutter mobile application, while service-centre staff manage operations through a React web application. An Agentic AI workflow analyses each request and prepares a validated service proposal for manager approval.

---

## User roles

1. **Customer.** Registers vehicles, submits service requests and tracks progress.
2. **Technician.** Records vehicle inspections and updates service-job status.
3. **Inventory Officer.** Manages spare parts, suppliers, stock and reservations.
4. **Service Manager.** Reviews AI proposals, quotations and schedules and approves or rejects them.
5. **Administrator.** Manages users, roles and system settings.

**Implementation note.** User management should be implemented as a shared mandatory feature. However, it is safer not to count it as one of the four main business components because authentication and role-based authorization are already compulsory requirements.

---

## Four main business components

| Component | Main functionality | Business-specific operation |
|---|---|---|
| Vehicle and Service Request Management | Vehicle registration, service requests, image uploads and request-status tracking | Validate vehicle ownership and initiate the Agentic AI workflow |
| Inspection and Maintenance Management | Vehicle inspections, maintenance history, technician findings and service records | Identify services due based on mileage and previous maintenance |
| Spare Parts and Inventory Management | Parts, suppliers, stock levels, reservations and low-stock alerts | Reserve parts transactionally and prevent negative stock |
| Scheduling, Quotation and Approval Management | Technicians, appointment slots, quotations, approvals and reports | Find a conflict-free appointment and calculate the complete quotation |

Each student should own one component and implement its:

- ASP.NET Core API endpoints
- PostgreSQL entities and relationships
- React interfaces
- Flutter interfaces
- Tests and documentation
- Distinct Agentic AI contribution

---

## Example complete scenario

A customer submits the following objective using Flutter:

> "Arrange my vehicle's 40,000 km service before 20 August, preferably after 3:00 PM, within a budget of LKR 45,000."

The customer selects the vehicle, uploads an odometer photograph and shares the current location.

### Workflow

1. **Flutter submission.** The customer logs in and submits the service request with preferred dates, budget, location and an image.
2. **ASP.NET Core processing.** The API validates the JWT, customer role, vehicle ownership, uploaded file, dates and budget. It then saves the request in PostgreSQL.
3. **Planning Agent.** The agent analyses the customer objective and creates a structured plan.
   - Retrieve maintenance history
   - Identify required services
   - Check spare parts
   - Find an appropriate technician
   - Find an available appointment
   - Calculate the quotation
   - Validate the proposal
   - Request manager approval
4. **Maintenance Analysis Agent.** This agent examines the vehicle mileage, previous services and service-centre rules. It produces a structured list of recommended service activities.
5. **Inventory and Action Agent.** This agent checks the availability and prices of required parts. It cannot reserve parts until the manager approves the proposal.
6. **Scheduling and Validation Agent.** This agent checks technician skills, available appointment slots, customer preferences, business hours, parts availability and estimated cost.
7. **Deterministic validation.** Before accepting the AI result, the system verifies the proposed result using fixed rules.
   - All proposed parts and services exist
   - Required stock is available
   - The technician has the correct skills
   - Appointments do not overlap
   - The quotation total is calculated correctly
   - The proposal meets the customer budget
   - The output follows the required JSON structure
8. **Human approval.** The workflow status becomes `PendingManagerApproval`. The service manager uses the React dashboard to review the plan, quotation, appointment, validation results and execution history.
   - Approve
   - Reject
   - Request revision
9. **Final execution.** After approval, ASP.NET Core uses a database transaction to create the appointment, assign the technician, reserve the parts and finalise the quotation.
10. **Flutter status update.** The customer receives the approved appointment, quotation and updated status through the mobile application.

Therefore, the complete cross-platform workflow is:

```
Flutter > ASP.NET Core > PostgreSQL > Agentic AI > React approval > Flutter status update
```

---

## Four specialized agents

| Agent | Responsibility |
|---|---|
| Planning Agent | Converts the customer objective into a structured plan and delegates tasks |
| Maintenance Analysis Agent | Examines service history and recommends maintenance activities |
| Inventory and Action Agent | Checks parts and reserves them only after approval |
| Scheduling and Validation Agent | Finds suitable technicians and appointments and validates the proposal |

Each agent must have:

- A clearly defined responsibility
- Structured input and output
- Controlled tool permissions
- Error handling
- Visible participation in the workflow
- Tests and documentation

---

## React web application

The React application will be used mainly by staff for:

- Managing service requests
- Managing inspections and maintenance records
- Parts and supplier CRUD
- Technician and appointment management
- Search, filtering, sorting and pagination
- Dashboards and reports
- Agent workflow monitoring
- Approving, rejecting or revising AI proposals
- Viewing audit and execution history

---

## Flutter mobile application

The Flutter application will support customers and technicians through:

- Registration, login and logout
- Secure JWT token storage
- Vehicle and service-request forms
- Image upload
- GPS location
- Date and time selection
- Service-request history and status tracking
- Technician inspection forms
- QR scanning for vehicles or parts
- Notifications

This provides meaningful mobile device features such as the camera, GPS and QR scanner.

---

## Third-party integration

A map or distance API can be integrated through ASP.NET Core to:

- Identify the nearest service branch
- Calculate the travelling distance
- Recommend a suitable branch

The backend should protect the API key and handle timeouts, invalid responses, rate limits and service failures.

---

## Final reminder

> **IMPORTANT - SAMPLE ONLY**
> The AutoCare AI scenario may not be selected, reproduced or submitted as a student project. Each group must develop a different and original real-world scenario.
