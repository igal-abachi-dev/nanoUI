export const UserProfile = {
  loader: async (params) => {
    const response = await fetch(`https://jsonplaceholder.typicode.com/users/${params.id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  },
  
  render: (data, actionResult, params) => ({
    html: `
      <h1>User Profile</h1>
      <div class="user-profile">
        <h2>${data.name}</h2>
        <p><strong>Username:</strong> ${data.username}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone}</p>
        <p><strong>Website:</strong> ${data.website}</p>
        <h3>Company</h3>
        <p>${data.company.name}</p>
        <p>${data.company.catchPhrase}</p>
        <h3>Address</h3>
        <p>${data.address.street}, ${data.address.suite}</p>
        <p>${data.address.city}, ${data.address.zipcode}</p>
      </div>
    `
  })
}; 