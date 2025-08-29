const signIn = [{
  method: 'GET',
  path: '/dcidmtest.onmicrosoft.com/oauth2/authresp',
  handler: (_request, h) => h.view('sign-in')
},
  // {
  //   method: 'POST',
  //   path: '/dcidmtest.onmicrosoft.com/oauth2/authresp',
  //   // validate: {
  //   //   payload: {

//   //   }
//   // }
//   handler: (request, h) => {
//     const { crn, password } = request.payload
//     const
//   }
]

export const auth = [
  ...signIn,
]
