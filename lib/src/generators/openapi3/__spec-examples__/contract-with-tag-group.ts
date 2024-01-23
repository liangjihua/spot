import {
  api,
  body,
  endpoint,
  response,
  securityHeader,
  tag,
  String
} from "../../../lib";

@api({ name: "contract" })
class Contract {
  /**
   * User API
   */
  @tag
  user(){}
}

@endpoint({
  method: "GET",
  path: "/users"
})
class GetEndpoint {
  @response({ status: 200 })
  successResponse(@body() body: { id: String; name: String }[]) {}
}
