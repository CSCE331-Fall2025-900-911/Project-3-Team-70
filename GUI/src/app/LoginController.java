package app;

import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.stage.Stage;
import java.sql.*;

public class LoginController {

    @FXML private PasswordField managerPasswordField;
    @FXML private PasswordField cashierPasswordField;
    @FXML private Label statusLabel;

    private final DatabaseConnector db = new DatabaseConnector();

    @FXML
    private void handleManagerLogin() {
        String password = managerPasswordField.getText();
        if (authenticate("Manager", password)) {
            loadView("ManagerView.fxml", "Manager Dashboard");
        } else {
            statusLabel.setText("Invalid manager password.");
        }
    }

    @FXML
    private void handleCashierLogin() {
        String password = cashierPasswordField.getText();
        if (authenticate("Cashier", password)) {
            loadView("CashierView.fxml", "Cashier Dashboard");
        } else {
            statusLabel.setText("Invalid cashier password.");
        }
    }

    private boolean authenticate(String role, String password) {
        String sql = "SELECT employeePasscode FROM employee WHERE employeePosition = ?;";
        try (Connection conn = db.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, role);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                if (password.equals(rs.getString("employeePasscode"))) {
                    return true;
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
            statusLabel.setText("Database error.");
        }
        return false;
    }

    private void loadView(String fxml, String title) {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/app/" + fxml));
            Scene scene = new Scene(loader.load(), 1000, 700);
            Stage stage = (Stage) managerPasswordField.getScene().getWindow();
            stage.setTitle(title);
            stage.setScene(scene);
        } catch (Exception e) {
            e.printStackTrace();
            statusLabel.setText("Error loading " + title + ".");
        }
    }
}
